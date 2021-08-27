const {ethers} = require("ethers");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const GlideSwapPair = artifacts.require("GlideSwapPair");

const GlideSwapFactory = artifacts.require("GlideSwapFactory");

const feeToSetter = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const GlideSwapRouter = artifacts.require("GlideSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const GlideToken = artifacts.require("GlideToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";
const schedulerAddress = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";
const FeeDistributor = artifacts.require("FeeDistributor");

const SugarToken = artifacts.require("Sugar");

const devAddr = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad"; //accounts[7] on truffle
const treasuryAddr = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad"; //accounts[8] on truffle
const glideTransferOwner = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";
const glidePerBlock = ethers.utils.parseEther('3');
const startBlock = 7892020;
const MasterChef = artifacts.require("MasterChef");

const glideVaultAdmin = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";
const treasuryAddrGlideVault = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad"; //accounts[9] on truffle
const GlideVault = artifacts.require("GlideVault");

const timeLockAdmin = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";
const timeLockDelay = 2 * 24 * 60 * 60; //2 days
const TimeLock = artifacts.require("TimeLock");

module.exports = async function(deployer) {
    // deploy TestTokenOne contract and get address
    await deployer.deploy(TestTokenOne);

    // deploy TestTokenTwo contract and get address
    await deployer.deploy(TestTokenTwo);

    // deploy GlideSwapPair contract
    await deployer.deploy(GlideSwapPair);

    // deploy GlideSwapFactory contract
    await deployer.deploy(GlideSwapFactory, feeToSetter);
    //access information about deployed contract instance
    const glideSwapFactoryInstance = await GlideSwapFactory.deployed();
    const glideSwapAddress = glideSwapFactoryInstance.address;

    // deploy GlideSwapRouter contract
    await deployer.deploy(GlideSwapRouter, glideSwapAddress, wELA);

    //Only for test purpose, delete this
    const initCodeHash = await glideSwapFactoryInstance.initCodeHash.call(); 
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

    // set feeTo on GlideSwapFactory to feeDistributor contract
    await glideSwapFactoryInstance.setFeeTo(feeDistributorAddress);
    // set mint feeTo arguments (feeToRate)
    await glideSwapFactoryInstance.setFeeToRate(5, 1);

    // deploy Sugar token
    await deployer.deploy(SugarToken, glideTokenAddress);
    const sugarTokenInstance = await SugarToken.deployed();
    const sugarTokenAddress = sugarTokenInstance.address;

    // deploy masterChef
    await deployer.deploy(MasterChef, glideTokenAddress, sugarTokenAddress, devAddr, treasuryAddr, glidePerBlock, startBlock, glideTransferOwner); 
    const masterChefInstance = await MasterChef.deployed();
    const masterChefAddress = masterChefInstance.address;

    // change owner for GlideToken and SugarToken to masterChef
    glideTokenInstance.transferOwnership(masterChefAddress);
    sugarTokenInstance.transferOwnership(masterChefAddress);

    // deploy Glide vault
    await deployer.deploy(GlideVault, glideTokenAddress, sugarTokenAddress, masterChefAddress, glideVaultAdmin, treasuryAddrGlideVault);

    // deploy TimeLock
    await deployer.deploy(TimeLock, timeLockAdmin, timeLockDelay);
}
