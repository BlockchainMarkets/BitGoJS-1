import BaseCoin = require('../baseCoin');
import * as _ from 'lodash';

const { MultiSigTransaction } = require('algosdk').Multisig;
const { Address, Seed, generateAccountFromSeed } = require('algosdk');

class Algo extends BaseCoin {

  constructor() {
    super();
  }

  getChain() {
    return 'algo';
  }

  getFamily() {
    return 'algo';
  }

  getFullName() {
    return 'Algorand';
  }

  getBaseFactor() {
    return 1e6;
  }

  /**
   * Flag for sending value of 0
   * @returns {boolean} True if okay to send 0 value, false otherwise
   */
  valuelessTransferAllowed(): boolean {
    // TODO: this sounds like its true with the staking txes - confirm before launch
    return false;
  }

  /**
   * Assemble keychain and half-sign prebuilt transaction
   *
   * @param params
   * @param params.txPrebuild {Object} prebuild object returned by platform
   * @param params.prv {String} user prv
   */
  signTransaction(params) {
    const prv = params.prv;
    const txData = params.txPrebuild.txData;
    const addressVersion = params.wallet.addressVersion;

    if (_.isUndefined(txData)) {
      throw new Error('missing txPrebuild parameter');
    }

    if (!_.isObject(txData)) {
      throw new Error(`txPrebuild must be an object, got type ${typeof txData}`);
    }

    if (_.isUndefined(prv)) {
      throw new Error('missing prv parameter to sign transaction');
    }

    if (!_.isString(prv)) {
      throw new Error(`prv must be a string, got type ${typeof prv}`);
    }

    if (!_.has(params, 'keychain') || !_.has(params, 'backupKeychain') || !_.has(params, 'bitgoKeychain')) {
      throw new Error('missing public keys parameter to sign transaction');
    }

    if (!_.isNumber(addressVersion)) {
      throw new Error('missing addressVersion parameter to sign transaction');
    }

    const refinedTxData = txData;
    refinedTxData.amount = parseInt(txData.amount, 10);

    if (!_.has(txData, 'note')) {
      refinedTxData.note = new Uint8Array(0);
    }

    // we need to re-encode our public keys using algosdk's format
    const encodedPublicKeys = [ 
      Address.decode(params.keychain.pub).publicKey, 
      Address.decode(params.backupKeychain.pub).publicKey, 
      Address.decode(params.bitgoKeychain.pub).publicKey 
    ];

    // re-encode sk from our prv (this acts as a seed out of the keychain)
    const seed = Seed.decode(prv).seed;
    const pair = generateAccountFromSeed(seed);
    const sk = pair.sk;

    // sign
    const transaction = new MultiSigTransaction(refinedTxData);
    const halfSigned = transaction.partialSignTxn({ version: addressVersion, threshold: 2, pks: encodedPublicKeys }, sk);

    return {
        halfSigned: halfSigned,
    };
  }
}

export default Algo;
