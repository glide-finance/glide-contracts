const {ethers} = require("ethers");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const OperaSwapPair = artifacts.require("OperaSwapPair");

const OperaSwapFactory = artifacts.require("OperaSwapFactory");

const feeToSetter = "0x7F5243ACBFb22b61345F5dA158c6FFfF70F234a0"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const GlideToken = artifacts.require("GlideToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0x7F5243ACBFb22b61345F5dA158c6FFfF70F234a0";
const schedulerAddress = "0x7F5243ACBFb22b61345F5dA158c6FFfF70F234a0";
const FeeDistributor = artifacts.require("FeeDistributor");

const SugarToken = artifacts.require("Sugar");

const devAddr = "0x6d61Aa2709816e1c61B3cEC00876F608830175C6";
const treasuryAddr = "0x22084ef93b98FF538801368Fe503916414f9fFE6";
const glideTransferOwner = "0x7F5243ACBFb22b61345F5dA158c6FFfF70F234a0";
const glidePerBlock = ethers.utils.parseEther('3');
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
    await deployer.deploy(MasterChef, glideTokenAddress, sugarTokenAddress, devAddr, treasuryAddr, glidePerBlock, startBlock, glideTransferOwner); 
    const masterChefInstance = await MasterChef.deployed();
    const masterChefAddress = masterChefInstance.address;

    // change owner for GlideToken and SugarToken to masterChef
    glideTokenInstance.transferOwnership(masterChefAddress);
    sugarTokenInstance.transferOwnership(masterChefAddress);
}
