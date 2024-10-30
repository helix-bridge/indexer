import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('questn/used')
  async questNUsedHelix(@Query('address') address: string) {
    return await this.appService.questNUsedHelix(
      {
        sender: address.toLowerCase(),
      },
      1
    );
  }

  @Get('questn/usedafter')
  async questNUsedAfter(@Query('address') address: string) {
    const where = {
      sender: address.toLowerCase(),
      startTime: { gt: 1729428516 },
    };
    return await this.appService.questNUsedHelix(where, 1);
  }

  @Get('questn/afterand3times')
  async questNUsedAfterAnd3Times(@Query('address') address: string) {
    const where = {
      sender: address.toLowerCase(),
      startTime: { gt: 1729428516 },
    };
    return await this.appService.questNUsedHelix(where, 3);
  }
}
