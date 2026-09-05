const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

function runLidCheck(input) {
  const script = `
    const { isAdminLid } = require(${JSON.stringify(path.join(__dirname, "..", "index.js"))});
    process.stdout.write(JSON.stringify({
      plain: isAdminLid(${JSON.stringify(input.plain)}),
      lid: isAdminLid(${JSON.stringify(input.lid)}),
      device: isAdminLid(${JSON.stringify(input.device)}),
      wrong: isAdminLid(${JSON.stringify(input.wrong)}),
      empty: isAdminLid("")
    }));
  `;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], {
    env: {
      ...process.env,
      PRIVATE_ALLOWED_LID: "235656601194672",
      ...(input.adminLid ? { ADMIN_LID: input.adminLid } : {}),
    },
    encoding: "utf8",
  }));
}

test("private allowed LID cocok setelah normalisasi", () => {
  assert.deepEqual(runLidCheck({
    plain: "235656601194672",
    lid: "235656601194672@lid",
    device: "235656601194672:1@lid",
    wrong: "235656601194673",
  }), {
    plain: true,
    lid: true,
    device: true,
    wrong: false,
    empty: false,
  });
});

test("ADMIN_LID diprioritaskan dari PRIVATE_ALLOWED_LID", () => {
  assert.equal(runLidCheck({
    adminLid: "235656601194672",
    plain: "235656601194672",
    lid: "235656601194672@lid",
    device: "235656601194672:1@lid",
    wrong: "999999999999999",
  }).plain, true);
});
