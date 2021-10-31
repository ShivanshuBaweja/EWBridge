import React from 'react'
import { Button, Col, FormControl, InputGroup, Modal, Row, Toast } from 'react-bootstrap'
import QRCode from "react-qr-code";
import _ from 'lodash';
import axios from 'axios'
import './style.css'


class BtcEth extends React.Component {
  authToken = 'token f036a825276ab1dae3dc1dc47c908778b7003b96';
  state = {
    qrData: '',
    showQr: false,
    showSuccessPopup: false,
    showErr: false,
    requestBody: {
      "amount": 0,
      "description": "This is a test invoice from Post Man",
      "expiry": 300,
      "privateRouteHints": false
    }
  }
  btcPrice: any;
  ethPrice: any;
  monitorProcess: any;
  invoiceHolder: any;
  componentDidMount() {
    // this.btcPrice = {currency: "BTC", price: "61266.68374687"};
    // this.ethPrice = {currency: "ETH", price: "4329.76141571"};
    const exchangeUrl = 'https://api.nomics.com/v1/prices?key=9244ba6b74b6185a2365f034500ed073333c824c'
    fetch(exchangeUrl).then(res => res.json()).then(data => {
      this.btcPrice = _.find(data, {currency: 'BTC'});
      this.ethPrice = _.find(data, {currency: 'ETH'});
      console.log(this.btcPrice)
      console.log(this.ethPrice)
    })
  }

  exchange = (token: any) => {
    let dValue = 0
    let uValue = 0
    let updatableToken = {}
    if(token.symbol === 'btc') {
      dValue = parseFloat(token.value) * parseFloat(this.btcPrice.price);
      uValue = 1/parseFloat(this.ethPrice.price)
      updatableToken = _.findIndex(this.tokenList, {symbol: 'eth'})
    } else {
      dValue = parseFloat(token.value) * parseFloat(this.ethPrice.price);
      uValue = 1/parseFloat(this.btcPrice.price)
      updatableToken = _.findIndex(this.tokenList, {symbol: 'btc'})
    }
    // @ts-ignore
    this.tokenList[updatableToken].value = dValue ? uValue * dValue : ''
    this.setState({});
  }

  tokenList = [
    {name: 'bitcoin', symbol: 'btc', displayName: 'BTC', value: undefined, key: 1},
    {name: 'ethereum', symbol: 'eth', displayName: 'ETH', value: undefined, key: 2},
  ]
  onSwap = () => {
    const _tokenList = this.tokenList[0];
    this.tokenList[0] = this.tokenList[1];
    this.tokenList[1] = _tokenList;

    this.setState({})
  }
  updateValue = (v: any, k: any) => {
    this.tokenList[k].value = v.target.value;
    this.setState({
      requestBody: {...this.state.requestBody, amount: parseFloat(v.target.value)}
    })
    this.exchange(this.tokenList[k]);
  }
  getInvoice = () => {
    const api = 'https://testpay.elephantthink.com/api/v1/server/lightning/BTC/invoices';
    const requestConf = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authToken,
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify(this.state.requestBody)
    }
    // @ts-ignore
    fetch(api, requestConf).then(data => data.json()).then((response: any) => {
      if(response.code == 'generic-error') {
        return this.setState({showErr: true})
      }
      this.invoiceHolder = response;
      this.setState({
        qrData: response.BOLT11,
        showQr: true
      })
      this.monitorInvoiceStatus();
    }).catch(e => {
      console.log(e)
      this.setState({showErr: true})
    })
  }
  closeQr = () => {
    this.setState({showQr: false})
  }
  monitorInvoiceStatus = () => {
    axios.get('https://testpay.elephantthink.com/api/v1/server/lightning/btc/invoices/' + this.invoiceHolder.id, {
      headers: {
        'Authorization': this.authToken
      }
    }).then((response: any) => {
      if(this.state.showQr) {
        if(response.data.status === 'Unpaid') {
          this.monitorInvoiceStatus();
        } else {
          this.setState({
            showQr: false,
            showSuccessPopup: true
          })
        }
      }
    })
  }
  render() {
    return (
      <>
        <div className="input-wrap">
        {this.tokenList.map((e, k) => (
          <InputGroup key={e.key} className="mb-2">
            <InputGroup.Text className="rounded-edge border-0">{e.displayName}</InputGroup.Text>
            <FormControl className="rounded-edge border-0 input-bg" value={e.value} type='number' onChange={(v) => {this.updateValue(v, k)}} placeholder="0.00" aria-label="With textarea" />
          </InputGroup>
        ))}
        <Button className="rounded-edge swap-btn" variant="outline-primary" onClick={this.onSwap}>Swap</Button>
        </div>
        <div className="d-grid gap-2">
          <Button className="rounded-edge mt-2" variant="primary" size="lg" onClick={this.getInvoice}>
            Pay with lightning
          </Button>
        </div>
        <Modal show={this.state.showQr}>
          <Modal.Header closeButton>
            <Modal.Title>Please scan or copy the code</Modal.Title>
          </Modal.Header>
            <Modal.Body className="text-center"><QRCode value={this.state.qrData} level="H" /> </Modal.Body>
            <br/>
          <div style={{wordWrap: 'break-word', padding: '0 16px'}}>
            {this.state.qrData}
          </div>

            <Modal.Footer>
              <Button variant="secondary" onClick={this.closeQr}>
                Close
              </Button>
            </Modal.Footer>

        </Modal>
        <Modal show={this.state.showSuccessPopup}>
          <Modal.Header closeButton>
            <Modal.Title>Success</Modal.Title>
            <Modal.Body>The amount is successfully paid</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => {this.setState({showSuccessPopup: false})}}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Header>
        </Modal>
        <Toast onClose={() => this.setState({showErr: false})} show={this.state.showErr} delay={3000} autohide>
          <Toast.Header>
            <img
              src="holder.js/20x20?text=%20"
              className="rounded me-2"
              alt=""
            />
            <strong className="me-auto">Error</strong>
          </Toast.Header>
          <Toast.Body>Something went wrong!</Toast.Body>
        </Toast>
      </>
    )
  }
}
export default BtcEth;
