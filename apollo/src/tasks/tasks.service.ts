import { Injectable, Logger } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { AggregationService } from '../aggregation/aggregation.service';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);
    constructor(private schedulerRegistry: SchedulerRegistry, private aggregationService: AggregationService) {}

    addInterval(name: string, milliseconds: number, callback: () => void) {
        this.logger.log(`new interval task added name:${name}, ms: ${milliseconds}`);
        const interval = setInterval(callback, milliseconds);
        this.schedulerRegistry.addInterval(name, interval);
    }
}
