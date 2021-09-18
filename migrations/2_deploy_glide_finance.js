const {ethers} = require("ethers");
const BN = require('bn.js');

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const GlidePair = artifacts.require("GlidePair");

const GlideFactory = artifacts.require("GlideFactory");

const feeToSetter = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const GlideRouter = artifacts.require("GlideRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const GlideToken = artifacts.require("GlideToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215";
const schedulerAddress = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215";
const FeeDistributor = artifacts.require("FeeDistributor");

const SugarToken = artifacts.require("Sugar");

const devAddr = "0xfdF4C3675037e1f7850dD99c0D3CA7D7725A2696"; //accounts[7] on truffle
const treasuryAddr = "0x607b7b4122053fCea389ffc56C6AEC5863bDF5CB"; //accounts[8] on truffle
const glideTransferOwner = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215";
const glidePerBlock = ethers.utils.parseEther('3');
const startBlock = 7892020;
const MasterChef = artifacts.require("MasterChef");

const glideVaultAdmin = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215";
const treasuryAddrGlideVault = "0xAFB1c1455297e685cb9ab06FD039FAfEf51aEf16"; //accounts[9] on truffle
const GlideVault = artifacts.require("GlideVault");

const timeLockAdmin = "0xD2BfeE6d1eCE02aC097b04f5821a15a13374E215";
const timeLockDelay = 2 * 24 * 60 * 60; //2 days
const TimeLock = artifacts.require("TimeLock");

module.exports = async function(deployer, network, accounts) {
    // deploy TestTokenOne contract and get address
    await deployer.deploy(TestTokenOne);

    // deploy TestTokenTwo contract and get address
    await deployer.deploy(TestTokenTwo);

    // deploy GlidePair contract
    await deployer.deploy(GlidePair);

    // deploy GlideFactory contract
    await deployer.deploy(GlideFactory, feeToSetter);
    //access information about deployed contract instance
    const glideFactoryInstance = await GlideFactory.deployed();
    const glideFactoryAddress = glideFactoryInstance.address;

    // deploy GlideRouter contract
    await deployer.deploy(GlideRouter, glideFactoryAddress, wELA);

    //Only for test purpose, delete this
    const initCodeHash = await glideFactoryInstance.initCodeHash.call(); 
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

    // set feeTo on GlideFactory to feeDistributor contract
    await glideFactoryInstance.setFeeTo(feeDistributorAddress);

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
