// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import '@openzeppelin/contracts/math/Math.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../interfaces/IGlideRouter.sol';
import '../interfaces/IGlidePair.sol';

library RouterHelper {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    function getTxDeadline() private view returns (uint256){
        return block.timestamp + 60;
    }

    //Given X input tokens, return Y output tokens without concern about minimum/slippage
    function swapTokens(address router, uint256 amount, address inputToken, address outputToken, address[] memory path) internal returns (uint256) {
        if (inputToken == outputToken) {
            return amount;
        }

        require(path.length > 0, "swapTokens: INVALID PATH");
        require(path[0] == inputToken, "swapTokens: INVALID PATH");
        require(path[path.length - 1] == outputToken, "swapTokens: INVALID PATH");

        uint256 inputTokenBal = IERC20(inputToken).balanceOf(address(this));
        require(inputTokenBal >= amount, "swapTokens: INSUFFICIENT AMOUNT");

        uint256 outputTokenBal = IERC20(outputToken).balanceOf(address(this));

        IERC20(inputToken).safeIncreaseAllowance(router, amount);
        IGlideRouter(router).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            0,
            path,
            address(this),
            getTxDeadline()
        );

        uint256 gains = IERC20(outputToken).balanceOf(address(this)).sub(outputTokenBal);
        return gains;
    }

    function addLiquidity(
        address router,
        address token0Address,
        address token1Address,
        uint256 token0Amt,
        uint256 token1Amt
    ) internal returns (uint256, uint256, uint256) {
        IERC20(token0Address).safeIncreaseAllowance(router, token0Amt);
        IERC20(token1Address).safeIncreaseAllowance(router, token1Amt);
        (uint amount0, uint amount1, uint liquidity) = IGlideRouter(router).addLiquidity(
            token0Address,
            token1Address,
            token0Amt,
            token1Amt,
            0,
            0,
            address(this),
            getTxDeadline()
        );
        return (amount0, amount1, liquidity);
    }

    function removeLiquidity(
        address router,
        address pairAddress,
        uint256 pairAmount
    ) internal returns (uint256, uint256){
        address token0Address = IGlidePair(pairAddress).token0();
        address token1Address = IGlidePair(pairAddress).token1();

        IERC20(pairAddress).safeIncreaseAllowance(router, pairAmount);
        (uint256 amount0, uint256 amount1) = IGlideRouter(router).removeLiquidity(
            token0Address,
            token1Address,
            pairAmount,
            0,
            0,
            address(this),
            getTxDeadline()
        );
        return (amount0, amount1);
    }

}