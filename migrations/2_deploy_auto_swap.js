const {ethers} = require("ethers");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const OperaSwapPair = artifacts.require("OperaSwapPair");

const OperaSwapFactory = artifacts.require("OperaSwapFactory");

const feeToSetter = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const GlideToken = artifacts.require("GlideToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1";
const schedulerAddress = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1";
const FeeDistributor = artifacts.require("FeeDistributor");

const SugarToken = artifacts.require("Sugar");

const devAddr = "0x06EE7e3e3ef0E6Eb2535433c16Dd39bcEbe56991"; //accounts[7] on truffle
const treasuryAddr = "0x92E134C18785E158913967635e1C6842E1D3f6AC"; //accounts[8] on truffle
const glideTransferOwner = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1";
const glidePerBlock = ethers.utils.parseEther('3');
const startBlock = 7892020;
const MasterChef = artifacts.require("MasterChef");

const glideVaultAdmin = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1";
const treasuryAddrGlideVault = "0xCbd98A2428b899435f22Bb2b05C4D5C60788DD45"; //accounts[9] on truffle
const GlideVault = artifacts.require("GlideVault");

const timeLockAdmin = "0xc5DC03305DC38FFCacD8bc9d89abB946A8A1f1a1";
const timeLockDelay = 2 * 24 * 60 * 60; //2 days
const TimeLock = artifacts.require("TimeLock");

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
    await deployer.deploy(MasterChef, glideTokenAddress, sugarTokenAddress, devAddr, treasuryAddr, glidePerBlock, startBlock, glideTransferOwner); 
    const masterChefInstance = await MasterChef.deployed();
    const masterChefAddress = masterChefInstance.address;

    // change owner for GlideToken and SugarToken to masterChef
    glideTokenInstance.transferOwnership(masterChefAddress);
    sugarTokenInstance.transferOwnership(masterChefAddress);

    // deploy Glide vault
    await deployer.deploy(GlideVault, glideTokenAddress, sugarTokenAddress, masterChefAddress, glideVaultAdmin, treasuryAddrGlideVault);

    // deploy TimeLock
    await deployer.deploy(TimeLock, timeLockAdmin, 0);
}
