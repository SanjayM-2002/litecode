"use server";

import { enqueueAndWait, JobType } from "@repo/queue";
import { revalidatePath } from "next/cache";

export async function generatePosts() {
  await enqueueAndWait(JobType.GeneratePosts, { count: 5 });
  revalidatePath("/");
}
