import Log from "../../shared/log/Log";
import { LiveDataSource, LiveDataSourceStatus } from "./LiveDataSource";

interface XYVUpdate {
  data: Record<string, unknown>;
  now_sec: number;
}

export default class XYVSource extends LiveDataSource {
  private RECONNECT_DELAY_MS = 500;
  private timeout: NodeJS.Timeout | null = null;
  private liveZeroTime = 0;

  connect(
    address: string,
    statusCallback: (status: LiveDataSourceStatus) => void,
    outputCallback: (log: Log, timeSupplier: () => number) => void
  ) {
    super.connect(address, statusCallback, outputCallback);

    if (window.preferences === null) {
      this.setStatus(LiveDataSourceStatus.Error);
    } else {
      this.log = new Log();
      window.sendMainMessage("live-vex-v5-start", {
        uuid: this.UUID
      });
    }
  }

  stop() {
    super.stop();
    window.sendMainMessage("live-vex-v5-stop");
  }

  handleMainMessage(data: any) {
    if (this.log === null) return;
    if (data.uuid !== this.UUID) return;
    if (this.status === LiveDataSourceStatus.Stopped) return;

    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (data.success) {
      // Receiving data, set to active
      this.setStatus(LiveDataSourceStatus.Active);

      // Decode JSON
      let decoded: XYVUpdate | null = null;
      try {
        decoded = JSON.parse(data.string);
      } catch {}

      // Add data
      if (decoded !== null) {
        const now = Date.now() / 1000;
        // Update time on first data
        if (this.liveZeroTime === 0) {
          this.liveZeroTime = now - decoded.now_sec;
        }

        const timestamp = now - this.liveZeroTime;

        for (const [key, value] of Object.entries(decoded.data)) {
          this.log.putXYV(key, timestamp, value);
        }
      }

      // Run output callback
      if (this.outputCallback !== null) {
        this.outputCallback(this.log, () => {
          if (this.log) {
            return Date.now() / 1000 - this.liveZeroTime;
          } else {
            return 0;
          }
        });
      }
    } else {
      // Failed to connect (or just disconnected), stop and reconnect automatically
      this.reconnect();
    }
  }

  private reconnect() {
    this.setStatus(LiveDataSourceStatus.Connecting);
    window.sendMainMessage("live-vex-v5-stop");
    this.timeout = setTimeout(() => {
      if (window.preferences === null) {
        // No preferences, can't reconnect
        this.setStatus(LiveDataSourceStatus.Error);
      } else {
        // Try to reconnect
        this.log = new Log();
        this.liveZeroTime = 0;
        window.sendMainMessage("live-vex-v5-start", {
          uuid: this.UUID
        });
      }
    }, this.RECONNECT_DELAY_MS);
  }
}
