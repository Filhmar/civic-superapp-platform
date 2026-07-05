import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Post, PostSchema } from './schemas/post.schema';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_CONTENT_URI'),
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Faq.name, schema: FaqSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
