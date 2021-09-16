const {ethers} = require("ethers");

const BN = require('bn.js');

const Timelock = artifacts.require("Timelock");
const MasterChef = artifacts.require("MasterChef");

contract("Timelock test", accounts => {
    const provider = new ethers.providers.JsonRpcProvider();

    var timeLockInstance;
    var masterChefInstance;

    // function for mine new blocks
    async function mineNBlocks(nBlock) {
        for(var counter = 0; counter < nBlock; counter++) {
            await provider.send("evm_mine", [] );
        }
    }

    //set contract instances
    before(async () => {
        timeLockInstance = await Timelock.deployed();
        assert.ok(timeLockInstance);

        masterChefInstance = await MasterChef.deployed();
        assert.ok(masterChefInstance);

        // transfer ownership for masterChef contract to timeLock, because it is not possible to call procedures with onlyOwner modifier
        masterChefInstance.transferOwnership(timeLockInstance.address);
    });

    it("...should mine `n` blocks on demand", async () => {
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        for(var counter = 0; counter < 5; counter++) {
            await provider.send("evm_mine", [] );
        }
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 5);
    });
   
    /* to run this test case, it should be change constant minimum_delay on time lock, and after that, change delay contract variable
    it("...should success transaction execute (change BonusReductionPeriod on masterChef contract) ", async () => {
        // bonus reduction period for set
        const newBonusReductionPeriod = 3144960;

        // get bonus reduction period before set on timeLock mechanism
        const bonusReductionPeriodBeforeSet = await masterChefInstance.bonusReductionPeriod.call();
        assert.equal(newBonusReductionPeriod != bonusReductionPeriodBeforeSet.toNumber(), true, "Bonus reduction period that is current set is same as new");

        // create data for queue and execute transaction for setBonusReductionPeriod on masterChef contract
        const signature = 'setBonusReductionPeriod(uint256)';
        const data = ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [newBonusReductionPeriod]
          );
        const blockTimestamp = await timeLockInstance.getBlockTimestamp();
        const nextBlockTime = 1;
        const eta = (new BN(blockTimestamp.toString())).add(new BN(nextBlockTime)); //next block

        // add transaction to queue
        await timeLockInstance.queueTransaction(masterChefInstance.address, 0, signature, data, eta);

        await mineNBlocks(100);

        // execute that transaction
        await timeLockInstance.executeTransaction(masterChefInstance.address, 0, signature, data, eta);

        // get bonus reduction period after set on timeLock mechanism
        const bonusReductionPeriodAfterSet = await masterChefInstance.bonusReductionPeriod.call();

        // assert between period that want to set and period from contract
        assert.equal(newBonusReductionPeriod, bonusReductionPeriodAfterSet.toNumber(), "Bonus reduction period is not correct set");
    });
    */

    /* to run this test case, it should be change constant minimum_delay on time lock, and after that, change delay contract variable
    it("...should success transaction execute (change delay on timeLock contract) ", async () => {
        const newDelay = 259200; //3 days
        // create data for queue and execute transaction for setDelay on timeLock contract
        const signature = 'setDelay(uint256)';
        const data = ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [newDelay]
          );
        const blockTimestamp = await timeLockInstance.getBlockTimestamp();
        const nextBlockTime = 1;
        const eta = (new BN(blockTimestamp.toString())).add(new BN(nextBlockTime)); //next block

        // add transaction to queue
        await timeLockInstance.queueTransaction(timeLockInstance.address, 0, signature, data, eta);

        await mineNBlocks(100);

        // execute that transaction
        await timeLockInstance.executeTransaction(timeLockInstance.address, 0, signature, data, eta);

        // get delay after set on timeLock mechanism
        const currentDelay = await timeLockInstance.delay.call();

        // assert between delay for set and after set
        assert.equal(newDelay, currentDelay.toNumber(), "Delay on timeLock contract is not correct set");
    });
    */


    it("...should revert transaction execute", async () => {
        // bonus reduction period for set
        const newStartBlock = 10000000;

        // get bonus reduction period before set on timeLock mechanism
        const startBlockBeforeSet = await masterChefInstance.startBlock.call();
        assert.equal(newStartBlock != startBlockBeforeSet.toNumber(), true, "Bonus reduction period that is current set is same as new");

        // create data for queue and execute transaction for setBonusReductionPeriod on masterChef contract
        const signature = 'setStartBlock(uint256)';
        const data = ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [newStartBlock]
          );
        const blockTimestamp = await timeLockInstance.getBlockTimestamp();
        const nextBlockTime = 345600; //4 days
        const eta = (new BN(blockTimestamp.toString())).add(new BN(nextBlockTime)); //next block

        // add transaction to queue
        await timeLockInstance.queueTransaction(masterChefInstance.address, 0, signature, data, eta);

        await mineNBlocks(100);

        try {
            // execute that transaction
            await timeLockInstance.executeTransaction(masterChefInstance.address, 0, signature, data, eta);
            throw null;
        }
        catch (error) {
            assert.equal(error.reason, "Timelock::executeTransaction: Transaction has not surpassed time lock.", "execute transaction hasn't revert with this message");
        }
    });
});