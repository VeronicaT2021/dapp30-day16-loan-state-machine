const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const StateMachine = artifacts.require('StateMachine.sol');

contract('StateMachine', (accounts) => {
  let stateMachine;
  const amount = 1000;
  const interest = 100;
  const duration = 100;

  const [borrower, lender] = [accounts[1], accounts[2]];
  before(async () => {
    stateMachine = await StateMachine.deployed();
  });

  it('Should NOT accept fund if not lender', async () => {
    await expectRevert(
      stateMachine.fund({ from: accounts[3] }),
      'only lender can lend'
    )
  });

  it('Should NOT accept fund if not exact amount', async () => {
    await expectRevert(
      stateMachine.fund({ from: lender, value: 123 }),
      'can only lend the exact amount'
    )
  });

  it('Should accept fund', async () => {
    const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(borrower));
    await stateMachine.fund({ from: lender, value: 1000 })
    const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(borrower));
    assert(balanceAfter.sub(balanceBefore).toNumber() === 1000)
    const state = await stateMachine.state()
    assert(state.toNumber() == 1) // State.ACTIVE
  });

  it('Should NOT reimburse if not borrower', async () => {
    await expectRevert(
      stateMachine.reimburse({ from: accounts[3], value: 123 }),
      'only borrower can reimburse'
    )
  });

  it('Should NOT reimburse if not exact amount', async () => {
    await expectRevert(
      stateMachine.reimburse({ from: borrower, value: 1000 }),
      'borrower need to reimburse exactly amount + interest'
    )
  });

  it('Should NOT reimburse if loan hasnt matured yet', async () => {
    await expectRevert(
      stateMachine.reimburse({ from: borrower, value: 1100 }),
      'loan hasnt matured yet'
    )
  });

  it('Should reimburse', async () => {
    await time.increase(100001);
    const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(lender));
    await stateMachine.reimburse({ from: borrower, value: 1100 })
    const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(lender));
    assert(balanceAfter.sub(balanceBefore).toNumber() === 1100)
    const state = await stateMachine.state()
    assert(state.toNumber() == 2) // State.CLOSE
  });
});
