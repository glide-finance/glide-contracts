const { soliditySha3 } = require("web3-utils");
const { sha3} = require("web3-utils");
const BN = require('bn.js');

const {ethers} = require("ethers");
const ethereumjs_util = require("ethereumjs-util");

const GlideFactory = artifacts.require("GlideFactory");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const GlideRouter = artifacts.require("GlideRouter");
const GlidePair = artifacts.require("GlidePair");
const FeeDistributor = artifacts.require("FeeDistributor");

const keccak256 = ethers.utils.keccak256;
const defaultAbiCoder = ethers.utils.defaultAbiCoder;
const toUtf8Bytes = ethers.utils.toUtf8Bytes;
const BigNumber = ethers.BigNumber;
const PERMIT_TYPEHASH = keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));
const ecsign = ethereumjs_util.ecsign;
const privateKey = "2447f8b7efd51184428894041af11048e50ee7f8da26027642ff83a0407cbfe6"; // for accounts[1]

const MINIMUM_LIQUIDITY = 1000;

function sqrt (value) {
  var z = new BN(0);
  if (value.gt(new BN(3))) {
    z = value;
    var x = value.div(new BN(2)).add(new BN(1));
    while (x.lt(z)) {
      z = x;
      x = value.div(x).add(x).div(new BN(2));
    }
  } else if (!value.eq(new BN(0))) {
    z = new BN(1);
  }
  return z;
}

function getDomainSeparator(name, tokenAddress) {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
          keccak256(toUtf8Bytes(name)),
          keccak256(toUtf8Bytes('1')),
          20,
          tokenAddress
        ]
      )
    );
}

function getApprovalDigest(
    DOMAIN_SEPARATOR,
    approve_owner,
    approve_spender,
    approve_value,
    nonce,
    deadline
) {
      var soliditySha3Value = soliditySha3('\x19\x01', DOMAIN_SEPARATOR, keccak256(defaultAbiCoder.encode(
        ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [PERMIT_TYPEHASH, approve_owner, approve_spender, BigNumber.from(approve_value), BigNumber.from(nonce), BigNumber.from(deadline)]
      )));

      //To stay for next time and testing (libraires and functions that I tried)
      /*var web3Value = sha3('\x19\x01' + DOMAIN_SEPARATOR + temp, {encoding:"hex"});
      console.log("WEB3-"+web3Value);
      console.log("KECCAK-SHA3-" + keccak256(soliditySha3Value));
      console.log("KECCAK-WEB3-" + keccak256(web3Value));
      var encodeNewPrev = defaultAbiCoder.encode(
        ['string', 'bytes32', 'bytes32'],
        ['\x19\x01', DOMAIN_SEPARATOR, temp]
      );
      const encodeNew = keccak256(encodeNewPrev);
      console.log("ENCODE-NEW-PREV-" + encodeNewPrev);
      console.log("ENCODE-NEW-" + encodeNew);*/

      return soliditySha3Value;
  }

contract("Glide test", accounts => {
    var glideFactoryInstance;
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var glideRouterInstance;
    var concretePairInstance;
    var feeDistributorInstance;

    //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
    const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
    const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
    const tstOneToTstTwoPrice = new BN(3);

    //set contract instances
    before(async () => {
        glideFactoryInstance = await GlideFactory.deployed();
        assert.ok(glideFactoryInstance);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);
        //console.log("testTokenOneInstance-" + testTokenOneInstance.address);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);
        //console.log("testTokenTwoInstance-" + testTokenTwoInstance.address);

        glideRouterInstance = await GlideRouter.deployed();
        assert.ok(glideRouterInstance);

        const glidePairInstance = await GlidePair.deployed();
        assert.ok(glidePairInstance);

        feeDistributorInstance = await FeeDistributor.deployed();
        assert.ok(feeDistributorInstance);
    });

    it("...should create pair", async () => {
        //create pair on factory
        await glideFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
          testTokenTwoInstance.address);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenOneInstance.address + " testTokenTwo - " + testTokenTwoInstance.address);
        //init instance for pair
        concretePairInstance = await GlidePair.at(pairAddress);

        const pairLength = await glideFactoryInstance.allPairsLength.call();
        assert.equal(pairLength.toNumber(), 1, "GlideFactory pair is not created correct");
    });

    it("...should transfer tokens", async() => {

        const approveValue = ethers.utils.parseEther('300');
        const valueForSent = ethers.utils.parseEther('100');
      
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
  
        const account1TestTokenOne = await testTokenOneInstance.balanceOf.call(accounts[1]);
        assert.equal(account1TestTokenOne.toString(), valueForSent.toString(), "testTokenOne is not successfully transfer to account[1]");
  
        const account1TestTokenTwo = await testTokenTwoInstance.balanceOf.call(accounts[1]);
        assert.equal(account1TestTokenTwo.toString(), valueForSent.toString(), "testTokenTwo is not successfully transfer to account[1]");
    });

    it("...should addLiquidity", async() => {
        //set approve for testTokenOne and testTokenTwo
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
        const approveValueTestTokenOneSet = await testTokenOneInstance.allowance.call(accounts[1], glideRouterInstance.address);
        assert.equal(valueForLiquidityTokenOne.toString(), approveValueTestTokenOneSet.toString(), "approve for testTokenOne is not set correct");

        await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
        const approveValueTestTokenTwoSet = await testTokenTwoInstance.allowance.call(accounts[1], glideRouterInstance.address);
        assert.equal(valueForLiquidityTokenTwo.toString(), approveValueTestTokenTwoSet.toString(), "approve for testTokenTwo is not set correct");
        
        //add liquidity
        await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from:accounts[1]});
        
        //check is liquidity correct set to pairValue for testTokenOne
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(valueForLiquidityTokenOne.toString(), liquidityTokenOneSet.toString(), "liquidityTokenOneValue is not correct set to pairAddress");

        //check is liquidity correct set to pairValue for testTokenTwo
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(valueForLiquidityTokenTwo.toString(), liquidityTokenTwoSet.toString(), "liquidityTokenTwoValue is not correct set to pairAddress");

        //check is liquidity token correct set to user account
        var liquidityValueCalculation = sqrt(new BN(liquidityTokenOneSet).mul(new BN(liquidityTokenTwoSet))).sub(new BN(MINIMUM_LIQUIDITY));
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(liquidityValueCalculation.toString(), liquidityValueSet.toString(), "addLiquidity is not created correct");
    });

    it("...should addLiquidityETH", async() => {
        const valueForAddLiquidityETHTokenOne = ethers.utils.parseEther('1');
        const valueForAddLiquidityETHTwETH = ethers.utils.parseEther('4');

        //set approve for testTokenOne
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
        const approveValueTestTokenOneSet = await testTokenOneInstance.allowance.call(accounts[1], glideRouterInstance.address);
        assert.equal(valueForAddLiquidityETHTokenOne.toString(), approveValueTestTokenOneSet.toString(), "approve for testTokenOne is not set correct");

        //add liquidity
        await glideRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTwETH.toString(),
            accounts[1],
            9000000000,
            {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});

        // get wETH address
        const wETHAddress = await glideRouterInstance.WETH();
        // get testTokenOne address - wETH address
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, wETHAddress);
        assert.equal(pairAddress != ethers.constants.AddressZero, true, "Pair for wETH is not created correct");

        const concretePairInstanceTestTokenOneETH = await GlidePair.at(pairAddress);
        //check is liquidity token correct set to user account
        var liquidityValueCalculation = sqrt(new BN(valueForAddLiquidityETHTokenOne.toString()).mul(new BN(valueForAddLiquidityETHTwETH.toString()))).sub(new BN(MINIMUM_LIQUIDITY));
        const liquidityValueSet = await concretePairInstanceTestTokenOneETH.balanceOf.call(accounts[1]);
        assert.equal(liquidityValueCalculation.toString(), liquidityValueSet.toString(), "addLiquidity is not created correct");
    });

    it("...should removeLiquidity", async() => {
        //const values
        const removeLiquidityValue = ethers.utils.parseEther('0.05');

        //set approve for remove liquidity
        await concretePairInstance.approve(glideRouterInstance.address, removeLiquidityValue, {from: accounts[1]});
        var approveValueSet = await concretePairInstance.allowance.call(accounts[1], glideRouterInstance.address)
        assert.equal(removeLiquidityValue.toString(), approveValueSet.toString(), "approve is not set correct");

        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTotalSupply = await concretePairInstance.totalSupply.call();
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);

        await glideRouterInstance.removeLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from: accounts[1]});
        
        //get liquidity token values after removeLiquidity
        const removeLiquidityAmountTokenOne = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenOneSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenOneSet).sub(new BN(removeLiquidityAmountTokenOne)), liquidityTokenOneSetNew.toString(), "removeLiquidity for TokenOne is not set correct");

        const removeLiquidityAmountTokenTwo = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenTwoSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenTwoSet).sub(new BN(removeLiquidityAmountTokenTwo)), liquidityTokenTwoSetNew.toString(), "removeLiquidity for TokenTwo is not set correct");

        //check is removeLiquidity created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(new BN(liquidityValueSet).sub(new BN(removeLiquidityValue.toString())), liquidityValueSetNew.toString(), "removeLiquidity is not created correct");
    });

    it("...should swap testTokenOne to testTokenTwo", async() => {
        const swapAmount = ethers.utils.parseEther('1');

        // get testTokenOne balance
        const account2TestTokenOneBeforeSwap = await testTokenOneInstance.balanceOf.call(accounts[2]);

        // approve testTokenOne for GlideRouter using
        await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[2]});

        // amount / price minus 5% deviation
        const onePercentSwapMiningAmount = new BN(swapAmount.toString()).div(new BN(100)).mul(new BN(5));
        const swapAmountOutMin = new BN(swapAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
        await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
          swapAmountOutMin,
          [testTokenOneInstance.address, testTokenTwoInstance.address],
          accounts[2],
          9000000000, 
          {from: accounts[2]});
        
        // get testTokenOne balance after
        const account2TestTokenOneAfterSwap = await testTokenOneInstance.balanceOf.call(accounts[2]);

        // assert for token swap (balance for testTokenOne)
        assert.equal(new BN(account2TestTokenOneBeforeSwap.toString()).sub(new BN(account2TestTokenOneAfterSwap.toString())).toString(), swapAmount.toString(), "swap is not correct executed");
    }); 

    it("...should addLiquidity to see mintFee", async() => {
      // get feeDistributor balanace for testTokenOne - testTokenTwo pair (before add liquidity)
      const feeDistributorBalanceBefore = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
      //console.log("feeDistributorBalance - before - " + feeDistributorBalanceBefore.toString());

      //set approve for testTokenOne and testTokenTwo
      await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
      const approveValueTestTokenOneSet = await testTokenOneInstance.allowance.call(accounts[1], glideRouterInstance.address);
      assert.equal(valueForLiquidityTokenOne.toString(), approveValueTestTokenOneSet.toString(), "approve for testTokenOne is not set correct");

      await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
      const approveValueTestTokenTwoSet = await testTokenTwoInstance.allowance.call(accounts[1], glideRouterInstance.address);
      assert.equal(valueForLiquidityTokenTwo.toString(), approveValueTestTokenTwoSet.toString(), "approve for testTokenTwo is not set correct");
      
      // get liquidityTokenOne before addLiquidity
      const liquidityTokenOneSetBefore = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);

      //add liquidity
      await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
          testTokenTwoInstance.address,
          valueForLiquidityTokenOne.toString(),
          valueForLiquidityTokenTwo.toString(),
          0,
          0,
          accounts[1],
          9000000000,
          {from:accounts[1]});
      
      const feeDistributorBalanceAfter = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
      //console.log("feeDistributorBalance - after - " + feeDistributorBalanceAfter.toString());
      // TODO find a way to calculate exact feeDistributorBalance after addLiquidity
      assert.equal(feeDistributorBalanceAfter > feeDistributorBalanceBefore, true, "feeDistributor balance is not larger after addLiquidity");

      //check is liquidity correct set to pairValue for testTokenOne
      const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
      assert.equal(new BN(liquidityTokenOneSetBefore.toString()).add(new BN(valueForLiquidityTokenOne.toString())).toString(), liquidityTokenOneSet.toString(), "liquidityTokenOneValue is not correct set to pairAddress");
  });

  it("...should removeLiquidityWithPermit", async() => {
        //const values
        const removeLiquidityValue = ethers.utils.parseEther('0.05');
        
        //set approve for remove liquidity
        await concretePairInstance.approve(glideRouterInstance.address, removeLiquidityValue, {from: accounts[1]});
        var approveValueSet = await concretePairInstance.allowance.call(accounts[1], glideRouterInstance.address)
        assert.equal(removeLiquidityValue.toString(), approveValueSet.toString(), "approve is not set correct");

        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTotalSupply = await concretePairInstance.totalSupply.call();
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);
        
        //signature
        const nonce = await concretePairInstance.nonces(accounts[1]);
        const name = await concretePairInstance.name();
        const DOMAIN_SEPARATOR = getDomainSeparator(name, concretePairInstance.address);
        const digest = getApprovalDigest(DOMAIN_SEPARATOR, accounts[1], glideRouterInstance.address, removeLiquidityValue, nonce.toNumber(), 9000000000);
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey, 'hex'));

        await glideRouterInstance.removeLiquidityWithPermit(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue,
            0,
            0,
            accounts[1],
            9000000000,
            false, 
            v,
            r,
            s,
            {from: accounts[1]});
        
        //get liquidity token values after removeLiquidityWithPermit
        const removeLiquidityAmountTokenOne = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenOneSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenOneSet).sub(new BN(removeLiquidityAmountTokenOne)), liquidityTokenOneSetNew.toString(), "removeLiquidityWithPermit for TokenOne is not set correct");

        const removeLiquidityAmountTokenTwo = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenTwoSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenTwoSet).sub(new BN(removeLiquidityAmountTokenTwo)), liquidityTokenTwoSetNew.toString(), "removeLiquidityWithPermit for TokenTwo is not set correct");

        //check is removeLiquidity created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(new BN(liquidityValueSet).sub(new BN(removeLiquidityValue.toString())), liquidityValueSetNew.toString(), "removeLiquidityWithPermit is not created correct");
    });
});