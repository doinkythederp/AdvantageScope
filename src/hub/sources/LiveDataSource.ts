import { createUUID } from "../../lib/util";
import Log from "../log/Log";

/** A provider of live log data (i.e. the data is updated as it is received). */
export abstract class LiveDataSource {
  protected status: LiveDataSourceStatus = LiveDataSourceStatus.Waiting;
  protected uuid: string = createUUID();

  protected address: string | null = null;
  protected statusCallback: ((status: LiveDataSourceStatus) => void) | null = null;
  protected outputCallback: ((log: Log) => void) | null = null;

  /**
   * Generates log data from a live source.
   * @param address The IP address of the source
   * @param statusCallback A callback to be triggered when the status changes
   * @param outputCallback A callback to be triggered when new data is available
   */
  connect(
    address: string,
    statusCallback: (status: LiveDataSourceStatus) => void,
    outputCallback: (log: Log) => void
  ): void {
    this.address = address;
    this.statusCallback = statusCallback;
    this.outputCallback = outputCallback;
    this.setStatus(LiveDataSourceStatus.Connecting);
  }

  /** Cancels the connection. */
  stop(): void {
    this.setStatus(LiveDataSourceStatus.Stopped);
  }

  /** Process new data from the main process, overriden by subclass. */
  handleMainMessage(data: any) {}

  /** Updates the current status and triggers the callback if necessary. */
  protected setStatus(status: LiveDataSourceStatus) {
    if (status != this.status && this.status != LiveDataSourceStatus.Stopped) {
      this.status = status;
      if (this.statusCallback != null) this.statusCallback(status);
    }
  }
}

export enum LiveDataSourceStatus {
  Waiting,
  Connecting,
  Active,
  Error,
  Stopped
}
