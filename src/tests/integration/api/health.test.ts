import { app } from "#/app.js";
import request from "supertest";

describe("GET /health", () => {
  it("should return a 200 status code and status ok", async () => {
    const response = await request(app)
      .get("/health")
      .expect("Content-Type", /json/);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
