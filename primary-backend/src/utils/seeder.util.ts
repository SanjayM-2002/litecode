import { PrismaClient } from '@prisma/client';
import { languages, topics, companies } from '../constants/constants';
const prisma = new PrismaClient();

class Seeder {
  public async seedLanguages(): Promise<void> {
    try {
      const languageRecords = languages.map((lang) => {
        return {
          name: lang,
        };
      });
      console.log('Seeding languages...', languageRecords);
      await prisma.language.createMany({
        data: languageRecords,
      });
    } catch (error) {
      console.error(error);
    }
  }
  public async seedTopics(): Promise<void> {
    try {
      const topicRecords = topics.map((t) => {
        return {
          name: t,
        };
      });
      console.log('Seeding topics...', topicRecords);
      await prisma.topic.createMany({
        data: topicRecords,
      });
    } catch (error) {
      console.error(error);
    }
  }
  public async seedCompanies(): Promise<void> {
    try {
      const companyRecords = companies.map((comp) => {
        return {
          name: comp,
        };
      });
      console.log('Seeding companies...', companyRecords);
      await prisma.company.createMany({
        data: companyRecords,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

const seeder = new Seeder();
seeder.seedCompanies();
