const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const IERC20 = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

/*
  Note requires a mainnet fork to interact with Uniswap
  npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/YOURAPIKEY
*/

describe("AvocadoToast", function () {
  let avo,pool,owner,user1,oneETH;
  
  it("Deployment", async function () {
    [owner,user1] = await ethers.getSigners();
    oneETH = ethers.utils.parseEther('1');
    const AVO = await hre.ethers.getContractFactory("AvocadoToast");
    avo = await AVO.deploy();
    await avo.deployed();
    expect(await avo.name()).to.eq('AvocadoToast');
  });

  it("Add Liquidity", async function () {
    await avo.addLiquidity();
    const balance = await avo.balanceOf(avo.address);
    expect(balance).to.lt(10000);
  });

  it("Revert On Second addLiquidity", async function () {
    await expect(avo.addLiquidity()).to.be.reverted;
  });

  it("Team Balance", async function () {
    const balance = await avo.balanceOf(owner.address);
    const expected = ethers.utils.parseEther('10000000');
    expect(balance).to.eq(expected);
  });

  it("Check Liquidity Pool", async function () {
    const poolAddress = await avo.pool();
    const poolAbi = ["function fee() external view returns (uint24)","function swap(address,bool,int256,uint160,bytes) external returns (int256, int256)"];
    pool = await hre.ethers.getContractAt(poolAbi, poolAddress);
    const fee = await pool.fee();
    expect(fee).to.eq(500);
  });

  it("Make Swap", async function () {
    const poolAddress = await avo.pool();
    const wethAbi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address, uint256) returns (bool)",
      "function approve(address, uint256) returns (bool)",
      "function deposit() payable",
      "function withdraw(uint256)",
    ];
    const routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const weth = await hre.ethers.getContractAt(wethAbi, wethAddress);
    const value = ethers.utils.parseEther('1');
    await weth.connect(user1).deposit({value});
    await weth.connect(user1).approve(routerAddress, value);
    const routerAbi = ['function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'];
    router = await hre.ethers.getContractAt(routerAbi, routerAddress);
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const tx = await router.connect(user1).exactInputSingle([wethAddress, avo.address, 500, user1.address, deadline, value, 0, 0]);
    await tx.wait();
  });
  
  it("User1 Balance", async function () {
    const value = ethers.utils.parseEther('0.98');
    const balance = await avo.balanceOf(user1.address);
    expect(balance).to.gt(value);
  });

  it("Deploy Multiple Times", async function () {
    // This is to check the fixOrdering works depending on deployment address
    for (let i = 0; i < 10; i++) {
      const AVO = await hre.ethers.getContractFactory("AvocadoToast");
      const avo2 = await AVO.deploy();
      await avo2.deployed();
      await avo2.addLiquidity();
      const balance = await avo2.balanceOf(avo2.address);
      expect(balance).to.lt(10000);
    }
  });

});
