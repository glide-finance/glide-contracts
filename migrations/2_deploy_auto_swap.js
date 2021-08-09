const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const OperaSwapPair = artifacts.require("OperaSwapPair");

const OperaSwapFactory = artifacts.require("OperaSwapFactory");

const feeToSetter = "0x3a45014f39db3ae1c7cba2ff575cedf35e39a9ad";

const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const wELA = "0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4"; //wrapped ELA token

module.exports = async function(deployer) {
    // deploy TestTokenOne contract and get address
    await deployer.deploy(TestTokenOne);

    // deploy TestTokenTwo contract and get address
    await deployer.deploy(TestTokenTwo);

    // deploy OperaSwapPair contract
    await deployer.deploy(OperaSwapPair);

    // deploy OperaSwapFactory contract
    await deployer.deploy(OperaSwapFactory, feeToSetter);
    //access information about your deployed contract instance
    const operaSwapFactoryInstance = await OperaSwapFactory.deployed();
    const operaSwapAddress = operaSwapFactoryInstance.address;

    // deploy OperaSwapRouter contract
    await deployer.deploy(OperaSwapRouter, operaSwapAddress, wELA);

    //Only for test purpose, delete this
    const initCodeHash = await operaSwapFactoryInstance.INIT_CODE_PAIR_HASH.call(); 
    console.log("initCodeHashValue - " + initCodeHash);
    //Only for test purpose, delete this
}
