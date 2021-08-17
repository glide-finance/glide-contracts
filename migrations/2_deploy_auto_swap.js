const {ethers} = require("ethers");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const OperaSwapPair = artifacts.require("OperaSwapPair");

const OperaSwapFactory = artifacts.require("OperaSwapFactory");

const feeToSetter = "0x68AFC18c0bdf8B7519bB726072A0Dc224Ea9e55E"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const GlideToken = artifacts.require("GlideToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0x68AFC18c0bdf8B7519bB726072A0Dc224Ea9e55E";
const schedulerAddress = "0x68AFC18c0bdf8B7519bB726072A0Dc224Ea9e55E";
const FeeDistributor = artifacts.require("FeeDistributor");

const SugarToken = artifacts.require("Sugar");

const devAddr = "0xaF4136205a306E563139d732Eb2d6Aff7Bf6A27E";
const treasuryAddr = "0xC554f273177E538A107fded3478E7Ef149E4B066";
const glidePerBlock = ethers.utils.parseEther('1.95');//1950000000000000000;
const startBlock = 7892020;
const MasterChef = artifacts.require("MasterChef");

module.exports = async function(deployer) {
    // deploy TestTokenOne contract and get address
    await deployer.deploy(TestTokenOne);

    // deploy TestTokenTwo contract and get address
    await deployer.deploy(TestTokenTwo);

    // deploy OperaSwapPair contract
    await deployer.deploy(OperaSwapPair);

    // deploy OperaSwapFactory contract
    await deployer.deploy(OperaSwapFactory, feeToSetter);
    //access information about deployed contract instance
    const operaSwapFactoryInstance = await OperaSwapFactory.deployed();
    const operaSwapAddress = operaSwapFactoryInstance.address;

    // deploy OperaSwapRouter contract
    await deployer.deploy(OperaSwapRouter, operaSwapAddress, wELA);

    //Only for test purpose, delete this
    const initCodeHash = await operaSwapFactoryInstance.initCodeHash.call(); 
    console.log("initCodeHashValue - " + initCodeHash);
    //Only for test purpose, delete this

    // deploy GlideToken contract
    await deployer.deploy(GlideToken);
    //access information about deployed contract instance
    const glideTokenInstance = await GlideToken.deployed();
    const glideTokenAddress = glideTokenInstance.address;
    
    // deploy swapRewardsChef
    await deployer.deploy(SwapRewardsChef, glideTokenAddress, wELA, wELA);
    //access information about deployed contract instance
    const swapRewardsChefInstance = await SwapRewardsChef.deployed();
    const swapRewardsChefAddress = swapRewardsChefInstance.address;

    // deploy feeDistributor contract
    await deployer.deploy(FeeDistributor, swapRewardsChefAddress, feeHolder, schedulerAddress, wELA);
    const feeDistributorInstance = await FeeDistributor.deployed();
    const feeDistributorAddress = feeDistributorInstance.address;

    // set feeTo on OperaSwapFactory to feeDistributor contract
    await operaSwapFactoryInstance.setFeeTo(feeDistributorAddress);
    // set mint feeTo arguments (feeToRate)
    await operaSwapFactoryInstance.setFeeToRate(5, 1);

    // deploy Sugar token
    await deployer.deploy(SugarToken, glideTokenAddress);
    const sugarTokenInstance = await SugarToken.deployed();
    const sugarTokenAddress = sugarTokenInstance.address;

    // deploy masterChef
    await deployer.deploy(MasterChef, glideTokenAddress, sugarTokenAddress, devAddr, treasuryAddr, glidePerBlock, startBlock); 
    const masterChefInstance = await MasterChef.deployed();
    const masterChefAddress = masterChefInstance.address;

    // change owner for GlideToken and SugarToken to masterChef
    glideTokenInstance.transferOwnership(masterChefAddress);
    sugarTokenInstance.transferOwnership(masterChefAddress);
}
