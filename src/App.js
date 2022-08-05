import { useState, useEffect } from "react";

import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";

import ierc from "./contracts/ierc.abi.json";
import eventmarket from "./contracts/eventmarket.abi.json";

const ERC20_DECIMALS = 18;

const contractAddress = "0x94C3F637De42b740422D04678037F2B753C98229";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

function App() {
  const [contract, setcontract] = useState(null);
  const [address, setAddress] = useState(null);
  const [kit, setKit] = useState(null);
  const [cUSDBalance, setcUSDBalance] = useState(0);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  const initializeWallet = async () => {
    if (window.celo) {
      try {
        await window.celo.enable();
        const web3 = new Web3(window.celo);
        let kit = newKitFromWeb3(web3);

        const accounts = await kit.web3.eth.getAccounts();
        const user_address = accounts[0];

        kit.defaultAccount = user_address;

        await setAddress(user_address);
        await setKit(kit);
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("Error Occurred");
    }
  };

  const getBalance = async () => {
    try {
      const balance = await kit.getTotalBalance(address);
      const USDBalance = balance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
      const contract = new kit.web3.eth.Contract(eventmarket, contractAddress);
      setcontract(contract);
      setcUSDBalance(USDBalance);
    } catch (error) {
      console.log(error);
    }
  };

  const getEvents = async () => {
    try {
      const eventLength = await contract.methods.getEventLength().call();
      const events = [];
      for (let index = 0; index < eventLength; index++) {
        const event = new Promise(async (resolve, reject) => {
          const _event = await contract.methods.getEvents(index).call();
          const date = new Date(_event[6] * 1000);
          console.log(date);
          resolve({
            index: index,
            owner: _event[0],
            name: _event[1],
            image: _event[2],
            description: _event[3],
            amount: _event[4],
            booked: _event[5],
            timestamp: date,
          });
        });
        events.push(event);
      }
      const _event = await Promise.all(events);
      setEvents(_event);
    } catch (e) {
      console.log(e);
    }
  };


  const formSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!name || !amount || !description || !image) return;
      const cUSDContract = new kit.web3.eth.Contract(ierc, cUSDContractAddress);
      const uploadFee = new BigNumber(1).shiftedBy(ERC20_DECIMALS).toString();
      await cUSDContract.methods
        .approve(contractAddress, uploadFee)
        .send({ from: address });
      await contract.methods
        .createEvent(name, image, description, amount)
        .send({
          from: address,
        });
      getBalance();
      getEvents();
    } catch (error) {
      console.log(error);
    }
  };

  const bookEvent = async (index) => {
    try {
      const isExpired = await contract.methods.getIsExpired(index).call();
      if (isExpired) {
        alert('Event has expired, Find another')
        return;
      }
      const cUSDContract = new kit.web3.eth.Contract(ierc, cUSDContractAddress);
      const amount = new BigNumber(events[index].amount).shiftedBy(ERC20_DECIMALS).toString();
      await cUSDContract.methods
        .approve(contractAddress, amount)
        .send({ from: address });
      await contract.methods
        .bookEvent(index)
        .send({
          from: address,
        });
      getBalance();
      getEvents()
    } catch (error) {
      console.log(error);
    }

  }

  const sellEventTicket = async (index) => {
    try {

      const isExpired = await contract.methods.getIsExpired(index).call();
      if (isExpired) {
        alert('Event has expired, Find another')
        return;
      }
      await contract.methods
        .sellEvent(index)
        .send({
          from: address,
        });
      getBalance();
      getEvents()
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    initializeWallet();
  }, []);

  useEffect(() => {
    if (contract) {
      getEvents();
    }
  }, [contract]);

  useEffect(() => {
    if (kit && address) {
      getBalance();
    }
  }, [kit, address]);
  return (
    <>
      <div>
        <header className="site-header sticky-top py-1">
          <nav className="container d-flex flex-column flex-md-row justify-content-between">
            <a className="py-2" style={{color:"white"}} href="#">
              <h3>Event Market</h3>
            </a>
            <a className="py-2 d-none d-md-inline-block" href="#">
              Balance: {cUSDBalance} cUSD
            </a>
          </nav>
        </header>
        <main>
          <div className="row row-cols-1 row-cols-md-3 mb-3 text-center">
            {events.map(event => <div className="col">
              <div className="card mb-4 rounded-3 shadow-sm">
                <div className="card-header py-3">
                  <h4 className="my-0 fw-bold">{event.name}</h4>
                </div>
                <div className="card-body">
                  <h1 className="card-title pricing-card-title">${event.amount}<small className="text-muted fw-light">cUSD</small></h1>
                  <img width={200} src={event.image} alt="" />
                  <p className="list-unstyled mt-3 mb-4">
                    {event.description}
                  </p>
                  {!event.booked ? <button type="button" onClick={() => bookEvent(event.index)} className="w-100 btn btn-lg btn-primary">Book Event</button>
                    : event.owner === address ?
                      <button type="button" onClick={() => sellEventTicket(event.index)} className="w-100 btn btn-lg btn-outline-danger">Sell Slot</button>
                      : "Ticket has already been bought"}
                </div>
              </div>
            </div>)}
          </div>
        </main>


        <div className="p-3 w-50 justify-content-center">
          <h2>Create Event</h2>
          <div className="">
            <form onSubmit={formSubmit}>
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control rounded-4"
                  id="floatingInput"
                  placeholder="Name"
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <label htmlFor="floatingInput">Name</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control rounded-4"
                  id="floatingInput"
                  placeholder="Amount"
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <label htmlFor="floatingInput">Amount</label>
              </div>
              <div className="form-floating mb-3">
                <textarea
                  className="form-control rounded-4"
                  id="floatingInput"
                  placeholder="Description"
                  rows={5}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <label htmlFor="floatingInput">Description</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  className="form-control rounded-4"
                  id="floatingInput"
                  placeholder="Image Url"
                  onChange={(e) => setImage(e.target.value)}
                  required
                />
                <label htmlFor="floatingInput">Image</label>
              </div>

              <button
                className="w-100 mb-2 btn  rounded-4 btn-primary"
                type="submit"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
