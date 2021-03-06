import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { ModalsService } from 'app/modals/modals.service';
import { RpcService } from 'app/core/rpc/rpc.module';

import { Amount } from '../../../shared/util/utils';
import { ZapColdstakingComponent } from './zap-coldstaking/zap-coldstaking.component';
import { RevertColdstakingComponent } from './revert-coldstaking/revert-coldstaking.component';

@Component({
  selector: 'app-coldstake',
  templateUrl: './coldstake.component.html',
  styleUrls: ['./coldstake.component.scss']
})
export class ColdstakeComponent implements OnDestroy {

  private log: any = Log.create('coldstake.component');

  coldStakingEnabled: boolean = undefined;
  stakingTowardsCold: boolean = undefined;
  activation: string = 'Activation in progress';
  public encryptionStatus: string = 'Locked';
  private progress: Amount = new Amount(0, 2);
  get coldstakeProgress(): number { return this.progress.getAmount() }
  private destroyed: boolean = false;

  hotstakingamount: number = 0.0;
  coldstakingamount: number = 0.0;

  hotstaking: any = {
    txs: [],
    amount: 0
  };

  coldstaking: any = {
    txs: [],
    amount: 0
  };

  constructor(
    private dialog: MatDialog,
    private _modals: ModalsService,
    private _rpc: RpcService
  ) {
    this._rpc.state.observe('encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.encryptionStatus = status);

    this._rpc.state.observe('ui:coldstaking')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.coldStakingEnabled = status);

    this._rpc.state.observe('ui:coldstaking:stake')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.stakingTowardsCold = status);

    this._rpc.state.observe('blocks')
      .takeWhile(() => !this.destroyed).throttle(val => Observable.interval(10000/*ms*/))
      .subscribe(block => this.rpc_progress());
    // TODO: move to coldstaking service
  }

  private rpc_progress(): void {
    // TODO: not necessary when cold staking disabled
    this.stakingStatus();

    if (this.coldstakeProgress === 100) {
      this.activation = 'Activated';
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  private stakingStatus() {
    this._rpc.call('getcoldstakinginfo').subscribe(coldstakinginfo => {
        this.progress = new Amount(coldstakinginfo['percent_in_coldstakeable_script'], 2);
        this.coldstakingamount = coldstakinginfo['percent_in_coldstakeable_script'];
        this.hotstakingamount = coldstakinginfo['coin_in_stakeable_script'];
    }, error => this.log.er('couldn\'t get coldstakinginfo', error));
  }

  zap() {
    if (this._rpc.state.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openZapColdstakingModal.bind(this)
      });
    } else {
      this.openZapColdstakingModal();
    }
  }

  openRevertColdstakingModal() {
    const dialogRef = this.dialog.open(RevertColdstakingComponent);
  }

  revert() {
    if (this._rpc.state.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openRevertColdstakingModal.bind(this)
      });
    } else {
      this.openRevertColdstakingModal();
    }
  }

  openZapColdstakingModal(): void {
    const dialogRef = this.dialog.open(ZapColdstakingComponent);
  }

  openUnlockWalletModal(): void {
    this._modals.open('unlock', {forceOpen: true, showStakeOnly: false, stakeOnly: true});
  }

  openColdStakeModal(): void {
    this._modals.open('coldStake', { forceOpen: true, type: 'cold' });
  }

  checkLockStatus(): boolean {
    return [
      'Unlocked',
      'Unlocked, staking only',
      'Unencrypted'
    ].includes(this.encryptionStatus);
  }
}
