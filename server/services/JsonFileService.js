import fs from "fs";
import path from "path";

export class JsonFileService {
  constructor(baseDir = "testing-data") {
    this.baseDir = baseDir;
    this.resultsDir = path.join(baseDir, "results");
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  readJson(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) return reject(err);
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  saveResult(originalFileName, resultData) {
    const baseName = path.basename(originalFileName, ".json");
    const resultFile = path.join(this.resultsDir, `processed-${baseName}.json`);
    return new Promise((resolve, reject) => {
      fs.writeFile(
        resultFile,
        JSON.stringify(resultData, null, 2),
        "utf8",
        (err) => {
          if (err) return reject(err);
          resolve(resultFile);
        }
      );
    });
  }
}
