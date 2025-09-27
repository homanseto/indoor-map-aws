import { JsonFileService } from "../server/services/JsonFileService.js";
import fs from "fs";
import path from "path";

describe("JsonFileService", () => {
  const testDir = "./testing-data";
  const testFile = "test-simple.json";
  const testFilePath = path.join(testDir, testFile);
  const testData = { hello: "world" };

  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(testFilePath, JSON.stringify(testData));
  });

  afterAll(() => {
    fs.unlinkSync(testFilePath);
  });

  it("reads a valid JSON file", async () => {
    const service = new JsonFileService(testDir);
    const data = await service.readJson(testFile);
    expect(data).toEqual(testData);
  });

  it("throws on missing file", async () => {
    const service = new JsonFileService(testDir);
    await expect(service.readJson("notfound.json")).rejects.toThrow();
  });
});
