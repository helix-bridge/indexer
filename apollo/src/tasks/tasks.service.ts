import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  public healthChecks = new Map();

  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addInterval(name: string, milliseconds: number, callback: () => void) {
    this.logger.log(`new interval task added name:${name}, ms: ${milliseconds}`);
    this.healthChecks.set(name, 0);
    const interval = setInterval(async () => {
      const callTimes: number = this.healthChecks.get(name);
      await callback();
      this.healthChecks.set(name, callTimes + 1);
    }, milliseconds);
    this.schedulerRegistry.addInterval(name, interval);
  }

  queryHealthChecks() {
    return this.healthChecks;
  }
}
