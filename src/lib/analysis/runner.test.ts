import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripIncompleteToolUse } from "./runner";
import type Anthropic from "@anthropic-ai/sdk";

describe("stripIncompleteToolUse", () => {
  it("drops tool_use blocks but keeps everything else", () => {
    const content = [
      { type: "text", text: "a pensar..." },
      { type: "tool_use", id: "1", name: "submit_equity_analysis", input: {} },
    ] as unknown as Anthropic.Beta.BetaContentBlock[];

    const result = stripIncompleteToolUse(content);

    assert.equal(result.length, 1);
    assert.equal(result[0].type, "text");
  });

  it("is a no-op when there is no tool_use block", () => {
    const content = [{ type: "text", text: "só texto" }] as unknown as Anthropic.Beta.BetaContentBlock[];
    assert.deepEqual(stripIncompleteToolUse(content), content);
  });
});
