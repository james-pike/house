import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import type { IncomingMessage, ServerResponse } from "node:http";

const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await new Promise<void>((resolve) => {
    router(req, res, () => {
      notFound(req, res, () => {
        resolve();
      });
    });
  });
}
