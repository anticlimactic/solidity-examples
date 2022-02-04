pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

// @title Simple Index Fund
// @notice Use this contract to create a simple index fund of 2 assets.
// @dev Simple index fund with customisable weights.
//      Depends on chainlink oracle service, Keep3r rebalancing service,
//      UniswapV3 liquidity service.
//      Only supports two assets for now.
contract SimpleIndexFund is Ownable {
    // @notice Info of each asset in the fund.
    struct AssetInfo {
        IERC20 addr;
        AggregatorV3Interface priceFeed;
        uint256 weight;
        uint8 decimals;
    }

    // @notice Info of each asset in the fund.
    AssetInfo[] public assets;

    // @notice UniswapV3 router address.
    ISwapRouter router;
    // @notice UniswapV3 pool fee.
    uint24 public constant poolFee = 3000;

    event AddAsset(IERC20 token, AggregatorV3Interface priceFeed, uint256 weight, uint8 decimals);
    event Deposit(uint8 id, uint256 amount);
    event Withdraw(uint8 id, uint256 amount, address to);
    event LogRebalance();

    constructor () {
        router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    }

    // @notice Add support for ERC20 asset.
    //         Do not add the same token more than once.
    // @param token Address of the ERC20 token.
    // @param priceFeed Address of the price feed corresponding to the ERC20 token.
    // @param weight Weight of asset in index fund (should be between 0 and 100)
    // @param decimals Decimals of ERC20 token.
    function add(IERC20 token, AggregatorV3Interface priceFeed, uint256 weight, uint8 decimals) public onlyOwner {
        require(0 <= weight, "Weight must be greater than zero.");
        require(weight <= 100, "Weight must be less than or equal to 100.");
        require(assets.length < 3, "Only supports two assets for now.");

        AssetInfo memory asset = AssetInfo(token, priceFeed, weight, decimals);
        assets.push(asset);

        emit AddAsset(token, priceFeed, weight, decimals);
    }

    // @notice Supports deposits of assets that have been added.
    //         Make sure you have approved the contract to transfer the ERC20 beforehand.
    // @param id Id corresponding to asset being deposited
    // @param amount Amount of ERC20 being deposited.
    function deposit(uint8 id, uint256 amount) public onlyOwner {
        require(id < assets.length - 1, "Asset id out of bounds.");

        assets[id].addr.transferFrom(msg.sender, address(this), amount);

        emit Deposit(id, amount);
    }

    // @notice Withdraw tokens to external address.
    // @param id Id corresponding to asset being withdrawn.
    // @param amount Amount of asset being withdrawn.
    // @param to Address that assets are being withdrawn to.
    function withdraw(uint8 id, uint256 amount, address to) public onlyOwner {
        require(to != address(0));
        require(amount < balanceOf(id), "Cannot transfer more than you have.");

        assets[id].addr.transfer(to, amount);

        emit Withdraw(id, amount, to);
    }

    // @notice Rebalances portfolio according to portfolio weights
    // @dev Assumes only two assets for simplicity.
    //      See notes in top level README.
    function rebalance() public returns (bool) {
        // fetch prices
        uint256[256] memory prices;
        uint256[256] memory currWeights;
        uint256[256] memory balances;
        uint256 sum;
        for (uint8 i = 0; i < assets.length; i++) {
            uint256 price = uint256(getLatestPrice(i));
            prices[i] = price;
            balances[i] = balanceOf(i);
            sum += balances[i] * prices[i];
        }

        // calculate current weights
        for (uint8 i = 0; i < assets.length; i++) {
            uint256 weight = balances[i] * prices[i] * 100 / sum;
            currWeights[i] = weight;
        }

        // assume only two assets for simplicity
        uint8 i = 0;
        uint8 j = 1;
        if (currWeights[j] > assets[j].weight) {
            j = 1;
            i = 0;
        }

        // calculate size of overweight portion and minimum acceptable amountOut
        uint256 overweight = (currWeights[i] - assets[i].weight) * balances[i] / 100;
        uint256 min = overweight / prices[j];

        TransferHelper.safeApprove(address(assets[i].addr), address(router), overweight);
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(assets[i].addr),
                tokenOut: address(assets[j].addr),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: overweight,
                amountOutMinimum: min,
                sqrtPriceLimitX96: 0
            });
        uint256 amountOut = router.exactInputSingle(params);

        emit LogRebalance();
    }

    // @notice Helper function to call oracle price feed.
    // @param id Id of asset whose price we wish to retrieve.
    // @return Returns price retrieved from oracle.
    function getLatestPrice(uint8 id) private returns (int256) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = assets[id].priceFeed.latestRoundData();
        return price;
    }

    // @notice Returns id of token added.
    // @param token ERC20 address of token whose id we wish to retrieve.
    // @return Id of asset corresponding to a given ERC20 token.
    function getId(IERC20 token) public view returns (uint8) {
        for (uint8 i = 0; i < assets.length; i++) {
            if (assets[i].addr == token) {
                return i;
            }
        }
        require(false, "Token not found.");
    }

    // @notice Returns balance of asset with given @id
    // @param id Id of asset whose balance we wish to retrieve.
    // @return Returns balance of asset.
    function balanceOf(uint8 id) public view returns (uint256) {
        return assets[id].addr.balanceOf(address(this));
    }
}
