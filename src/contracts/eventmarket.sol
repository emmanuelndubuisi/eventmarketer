// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract EventMarketer {
    struct Event {
        address payable owner;
        address currentCustomer;
        string name;
        string image;
        string description;
        uint amount;
        bool booked;
        uint timestamp;
    }

    uint private uploadFee;
    address private admin;

    constructor() {
        uploadFee = 1 ether;
        admin = msg.sender;
    }

    uint internal eventLength = 0;
    mapping(uint => Event) internal events;
    mapping(uint => bool) public exists;

    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    modifier isOwner(uint _index) {
        require(
            msg.sender == events[_index].owner,
            "Accessible only to the owner"
        );
        _;
    }

    modifier isExpired(uint _index) {
        require(
            block.timestamp > events[_index].timestamp,
            "Event hasn't expired"
        );
        _;
    }

    modifier exist(uint _index){
        require(exists[_index], "Query of nonexistent event");
        _;
    }

    /// @dev allows users to create an event
    /// @notice requires a fee to be paid to create an event
    function createEvent(
        string calldata _name,
        string calldata _image,
        string calldata _description,
        uint amount
    ) external payable {
        require(bytes(_name).length > 0, "Empty name");
        require(bytes(_description).length > 0, "Empty description");
        require(bytes(_image).length > 0, "Empty image url");
        require(amount > 0, "Invalid amount");
        events[eventLength] = Event(
            payable(msg.sender),
            address(0),
            _name,
            _image,
            _description,
            amount * 1 ether,
            false,
            0
        );
        exists[eventLength] = true;
        eventLength++;
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                admin,
                uploadFee
            ),
            "This transaction could not be performed"
        );
    }


    function getEvents(uint _index)
        public
        view
        returns (
            address payable,
            string memory,
            string memory,
            string memory,
            uint,
            bool,
            uint
        )
    {
        Event storage _event = events[_index];
        return (
            _event.owner,
            _event.name,
            _event.image,
            _event.description,
            _event.amount,
            _event.booked,
            _event.timestamp
        );
    }

    /// @dev allows users to book an event
    function bookEvent(uint _index) external payable exist(_index) {
        require(
            events[_index].owner != msg.sender,
            "You can't book your own event"
        );
        require(!events[_index].booked, "Already booked");

        events[_index].booked = true;
        events[_index].currentCustomer = msg.sender;
        events[_index].timestamp = block.timestamp + 2 minutes;
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                events[_index].owner,
                events[_index].amount
            ),
            "This transaction could not be performed"
        );
    }


    /// @dev allows users to end the booking of an event
    /// @notice booking can be ended by either event owner or the current customer
    function endBooking(uint _index)
        public
        payable
        exist(_index)
        isExpired(_index)
    {
        require(events[_index].booked, "Event isn't booked");
        require(events[_index].owner == msg.sender || events[_index].currentCustomer == msg.sender, "Unauthorized user");
        
        events[_index].booked = false;
        events[_index].currentCustomer = address(0);
    }

    /// @dev allows users to check if booking of an event is expired
    function getIsExpired(uint _index) public view exist(_index) returns (bool) {
        if (block.timestamp > events[_index].timestamp) {
            return true;
        }
        return false;
    }

    function getEventLength() public view returns (uint) {
        return eventLength;
    }
}
