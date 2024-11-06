import { Controller, Get, Query, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('quest/used')
  async questUsedHelix(@Query('address') address: string) {
    return await this.appService.questUsedHelix(
      {
        sender: address.toLowerCase(),
      },
      1
    );
  }

  @Get('quest/after/:timestamp/times/:times')
  async questUsedAfterAnd3Times(
      @Param('timestamp') timestamp: number,
      @Param('times') times: number,
      @Query('address') address: string) {
    const where = {
      sender: address.toLowerCase(),
      startTime: { gt: timestamp },
    };
    return await this.appService.questUsedHelix(where, times);
  }
}
