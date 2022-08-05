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

contract EventMarketer{
    struct Event{
        address payable owner;
        string name;
        string image;
        string description;
        uint amount;
        bool booked;
        uint timestamp;
    }

    uint uploadFee;
    address internal admin;
    constructor (){
       uploadFee = 1000000000000000000;
       admin = msg.sender;
    }
    uint internal eventLength = 0;
    mapping (uint => Event) internal events;
    
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    
    
    modifier isOwner(uint _index) {
        require(msg.sender == events[_index].owner,"Accessible only to the owner");
        _;
    }


    modifier isExpired(uint _index){
        require(block.timestamp < (events[_index].timestamp + 2 minutes), "Event has expired");
        _;
    }
    
    function createEvent(
        string memory _name,
        string memory _image,
        string memory _description,
        uint amount
    )public{
        require(
              IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                admin,
                uploadFee
              ),    
              "This transaction could not be performed"
        );
        events[eventLength] = Event(
            payable(msg.sender),
            _name,
            _image,
            _description,
            amount,
            false,
            block.timestamp
        );
        
        eventLength++;
    }
    
    function getEvents(uint _index) public view returns(
        address payable,
        string memory,
        string memory,
        string memory,
        uint,
        bool,
        uint
    ){
        Event storage _event = events[_index];
        return(
            _event.owner,
            _event.name,
            _event.image,
            _event.description,
            _event.amount,
            _event.booked,
            _event.timestamp
        );
    }

    function bookEvent(uint _index) public payable isExpired(_index){

        require(
              IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                admin,
                events[_index].amount * 1000000000000000000
              ),    
              "This transaction could not be performed"
        );
        events[_index].booked = true;
    }

    function sellEvent(uint _index) public payable isOwner(_index) isExpired(_index){
        events[_index].booked = false;
    }

    function getIsExpired(uint _index) public view returns(bool){
        if(block.timestamp > (events[_index].timestamp + 2 minutes)){
            return true;
        }
        return false;
    }
    
    function getEventLength() public view returns (uint){
        return eventLength;
    }
}