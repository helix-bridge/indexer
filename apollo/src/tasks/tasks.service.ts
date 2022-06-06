import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addInterval(name: string, milliseconds: number, callback: () => void) {
    this.logger.log(`new interval task added name:${name}, ms: ${milliseconds}`);
    const interval = setInterval(callback, milliseconds);
    this.schedulerRegistry.addInterval(name, interval);
  }
}
