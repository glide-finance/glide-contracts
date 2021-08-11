const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const OperaSwapPair = artifacts.require("OperaSwapPair");

const OperaSwapFactory = artifacts.require("OperaSwapFactory");

const feeToSetter = "0xCCfA5CddF4B8269e42709E725Ca8EC4c068795ff"; //"0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

const OperaToken = artifacts.require("OperaToken");

const SwapRewardsChef = artifacts.require("SwapRewardsChef");

const feeHolder = "0xCCfA5CddF4B8269e42709E725Ca8EC4c068795ff";
const schedulerAddress = "0xCCfA5CddF4B8269e42709E725Ca8EC4c068795ff";
const FeeDistributor = artifacts.require("FeeDistributor");

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

    // deploy OperaToken contract
    await deployer.deploy(OperaToken);
    //access information about deployed contract instance
    const operaTokenInstance = await OperaToken.deployed();
    const operaTokenAddress = operaTokenInstance.address;
    
    // deploy swapRewardsChef
    await deployer.deploy(SwapRewardsChef, operaTokenAddress, wELA);
    //access information about deployed contract instance
    const swapRewardsChefInstance = await SwapRewardsChef.deployed();
    const swapRewardsChefAddress = swapRewardsChefInstance.address;

    // deploy feeDistributor contract
    await deployer.deploy(FeeDistributor, swapRewardsChefAddress, feeHolder, schedulerAddress);
    const feeDistributorInstance = await FeeDistributor.deployed();
    const feeDistributorAddress = feeDistributorInstance.address;

    // set feeTo on OperaSwapFactory to feeDistributor contract
    await operaSwapFactoryInstance.setFeeTo(feeDistributorAddress);
    // set mint feeTo arguments (feeToRate)
    await operaSwapFactoryInstance.setFeeToRate(5, 1);
}
