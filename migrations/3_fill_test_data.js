const {ethers} = require("ethers");
const BN = require('bn.js');

const TestTokenOne = artifacts.require("TestTokenOne");

const TestTokenTwo = artifacts.require("TestTokenTwo");

const GlideRouter = artifacts.require("GlideRouter");

const GlideFactory = artifacts.require("GlideFactory");

const FeeDistributor = artifacts.require("FeeDistributor");

module.exports = async function(deployer, network, accounts) {
    /*
    const feeDistributorInstance = await FeeDistributor.deployed();

    const testTokenOneInstance = await TestTokenOne.deployed();

    const testTokenTwoInstance = await TestTokenTwo.deployed();

    const glideRouterInstance = await GlideRouter.deployed();

    const glideFactoryInstance = await GlideFactory.deployed();

    wETHAddress = await glideRouterInstance.WETH();

    //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
    const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
    const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
    const tstOneToTstTwoPrice = new BN(3);

    // create pair
    await glideFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

    const approveValue = ethers.utils.parseEther('300');
    const valueForSent = ethers.utils.parseEther('100');
    stakeGlideTokenValue = ethers.utils.parseEther('50');
    
    // transfer testTokenOne to account[1],account[2], account[3];
    await testTokenOneInstance.approve(accounts[0], approveValue);
    await testTokenOneInstance.transferFrom(accounts[0], accounts[1], valueForSent);
    await testTokenOneInstance.transferFrom(accounts[0], accounts[2], valueForSent);
    await testTokenOneInstance.transferFrom(accounts[0], accounts[3], valueForSent);

    // transfer testTokenTwo to account[1],account[2], account[3];
    await testTokenTwoInstance.approve(accounts[0], approveValue);
    await testTokenTwoInstance.transferFrom(accounts[0], accounts[1], valueForSent);
    await testTokenTwoInstance.transferFrom(accounts[0], accounts[2], valueForSent);
    await testTokenTwoInstance.transferFrom(accounts[0], accounts[3], valueForSent);

    //add liquidity
    await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
    await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
    await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
        testTokenTwoInstance.address,
        valueForLiquidityTokenOne.toString(),
        valueForLiquidityTokenTwo.toString(),
        0,
        0,
        accounts[1],
        9000000000,
        {from:accounts[1]});

    //add liquidity ETH
    const valueForAddLiquidityETHTokenOne = ethers.utils.parseEther('1');
    const valueForAddLiquidityETHTwETH = ethers.utils.parseEther('4');
    await testTokenOneInstance.approve(glideRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
    await glideRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
        valueForAddLiquidityETHTokenOne.toString(),
        valueForAddLiquidityETHTokenOne.toString(),
        valueForAddLiquidityETHTwETH.toString(),
        accounts[1],
        9000000000,
        {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});

    //swap amount
    const swapAmount = ethers.utils.parseEther('0.5');
    await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[2]});
    const onePercentSwapMiningAmount = new BN(swapAmount.toString()).div(new BN(100)).mul(new BN(5));
    const swapAmountOutMin = new BN(swapAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
    await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
        swapAmountOutMin,
        [testTokenOneInstance.address, testTokenTwoInstance.address],
        accounts[2],
        9000000000, 
        {from: accounts[2]});

    //swap amount
    await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[3]});
    await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
        swapAmountOutMin,
        [testTokenOneInstance.address, testTokenTwoInstance.address],
        accounts[3],
        9000000000, 
        {from: accounts[3]});

    //add liquidity
    await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
    await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
    await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
        testTokenTwoInstance.address,
        valueForLiquidityTokenOne.toString(),
        valueForLiquidityTokenTwo.toString(),
        0,
        0,
        accounts[1],
        9000000000,
        {from:accounts[1]});

    //swap amount
    await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[3]});
    await glideRouterInstance.swapTokensForExactETH(swapAmount,
        ethers.utils.parseEther('5'),
        [testTokenOneInstance.address, wETHAddress],
        accounts[3],
        9000000000, 
        {from: accounts[3]});

    //add liquidity ETH
    await testTokenOneInstance.approve(glideRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
    await glideRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
        valueForAddLiquidityETHTokenOne.toString(),
        valueForAddLiquidityETHTokenOne.toString(),
        0,
        accounts[1],
        9000000000,
        {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});

    const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
        testTokenTwoInstance.address);

    const pairAddressWETH = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
        wETHAddress);

    console.log("PairAddress: " + pairAddress);

    console.log("PairAddressWETH: " + pairAddressWETH);

    console.log("FeeDistributorInstanceAddress: " + feeDistributorInstance.address);

    console.log("GlideRouterInstance: " + glideRouterInstance.address);
    */
}
