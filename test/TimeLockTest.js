const {ethers} = require("ethers");
const { evm } = require("./test-utils");

const BN = require('bn.js');

const Timelock = artifacts.require("Timelock");
const MasterChef = artifacts.require("MasterChef");

contract("Timelock contract", accounts => {
    var timeLockInstance;
    var masterChefInstance;

    //set contract instances
    before(async () => {
        timeLockInstance = await Timelock.deployed();
        assert.ok(timeLockInstance);

        masterChefInstance = await MasterChef.deployed();
        assert.ok(masterChefInstance);

        // transfer ownership for masterChef contract to timeLock, because it is not possible to call procedures with onlyOwner modifier
        masterChefInstance.transferOwnership(timeLockInstance.address);
    });
   
    it("...should success transaction execute (change setStartBlock on masterChef contract) ", async () => {
        // start block for set
        const newStartBlock = 10000000;

        // get start block efore set on timeLock mechanism
        const startBlockBeforeSet = await masterChefInstance.startBlock.call();
        assert.equal(newStartBlock != startBlockBeforeSet.toNumber(), true, "Start block that is current set is same as new");

        // create data for queue and execute transaction for setStartBlock on masterChef contract
        const signature = 'setStartBlock(uint256)';
        const data = ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [newStartBlock]
          );
        const blockTimestamp = await timeLockInstance.getBlockTimestamp();
        const nextBlockTime = 7 * 24 * 60 * 60;
        const eta = (new BN(blockTimestamp.toString())).add(new BN(nextBlockTime)); //next block

        // add transaction to queue
        await timeLockInstance.queueTransaction(masterChefInstance.address, 0, signature, data, eta);

        await evm.advanceTime(nextBlockTime);

        // execute that transaction
        await timeLockInstance.executeTransaction(masterChefInstance.address, 0, signature, data, eta);

        // get start block period after set on timeLock mechanism
        const startBlockAfterSet = await masterChefInstance.startBlock.call();

        // assert between period that want to set and period from contract
        assert.equal(newStartBlock, startBlockAfterSet.toNumber(), "Start block period is not correct set");
    });

    // to run this test case, it should be change constant minimum_delay on time lock, and after that, change delay contract variable
    it("...should success transaction execute (change delay on timeLock contract) ", async () => {
        const newDelay = 259200; //3 days
        // create data for queue and execute transaction for setDelay on timeLock contract
        const signature = 'setDelay(uint256)';
        const data = ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [newDelay]
          );
        const blockTimestamp = await timeLockInstance.getBlockTimestamp();
        const nextBlockTime = 7 * 24 * 60 * 60;
        const eta = (new BN(blockTimestamp.toString())).add(new BN(nextBlockTime)); //next block

        // add transaction to queue
        await timeLockInstance.queueTransaction(timeLockInstance.address, 0, signature, data, eta);

        await evm.advanceTime(nextBlockTime);

        // execute that transaction
        await timeLockInstance.executeTransaction(timeLockInstance.address, 0, signature, data, eta);

        // get delay after set on timeLock mechanism
        const currentDelay = await timeLockInstance.delay.call();

        // assert between delay for set and after set
        assert.equal(newDelay, currentDelay.toNumber(), "Delay on timeLock contract is not correct set");
    });

    it("...should revert transaction execute", async () => {
        // start block for set
        const newStartBlock = 15000000;

        // get start block before set on timeLock mechanism
        const startBlockBeforeSet = await masterChefInstance.startBlock.call();
        assert.equal(newStartBlock != startBlockBeforeSet.toNumber(), true, "Start block that is current set is same as new");

        // create data for queue and execute transaction for setStartBlock on masterChef contract
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