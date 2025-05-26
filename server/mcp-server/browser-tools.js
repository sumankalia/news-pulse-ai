"use strict"; /*jslint node:true es9:true*/

import dotenv from "dotenv";
dotenv.config();

import { UserError, imageContent } from "fastmcp";
import { z } from "zod";
import { Browser_session } from "./browser_session.js";
let browser_auth = process.env.BROWSER_AUTH;
console.log(browser_auth);

let open_session;
const require_browser = () => {
  return (open_session =
    open_session ||
    new Browser_session({
      cdp_endpoint: calculate_cdp_endpoint(),
    }));
};

const calculate_cdp_endpoint = () => {
  if (browser_auth.startsWith("ws://") || browser_auth.startsWith("wss://"))
    return browser_auth;
  return `wss://${browser_auth}@brd.superproxy.io:9222`;
};

let scraping_browser_navigate = {
  name: "scraping_browser_navigate",
  description: "Navigate a scraping browser session to a new URL",
  parameters: z.object({
    url: z.string().describe("The URL to navigate to"),
  }),
  execute: async ({ url }) => {
    const page = await require_browser().get_page({ url });
    try {
      await page.goto(url, {
        timeout: 120000,
        waitUntil: "domcontentloaded",
      });
      return [
        `Successfully navigated to ${url}`,
        `Title: ${await page.title()}`,
        `URL: ${page.url()}`,
      ].join("\n");
    } catch (e) {
      throw new UserError(`Error navigating to ${url}: ${e}`);
    }
  },
};

let scraping_browser_go_back = {
  name: "scraping_browser_go_back",
  description: "Go back to the previous page",
  parameters: z.object({}),
  execute: async () => {
    const page = await (await require_browser()).get_page();
    try {
      await page.goBack();
      return [
        "Successfully navigated back",
        `Title: ${await page.title()}`,
        `URL: ${page.url()}`,
      ].join("\n");
    } catch (e) {
      throw new UserError(`Error navigating back: ${e}`);
    }
  },
};

const scraping_browser_go_forward = {
  name: "scraping_browser_go_forward",
  description: "Go forward to the next page",
  parameters: z.object({}),
  execute: async () => {
    const page = await (await require_browser()).get_page();
    try {
      await page.goForward();
      return [
        "Successfully navigated forward",
        `Title: ${await page.title()}`,
        `URL: ${page.url()}`,
      ].join("\n");
    } catch (e) {
      throw new UserError(`Error navigating forward: ${e}`);
    }
  },
};

let scraping_browser_click = {
  name: "scraping_browser_click",
  description: [
    "Click on an element.",
    "Avoid calling this unless you know the element selector (you can use " +
      "other tools to find those)",
  ].join("\n"),
  parameters: z.object({
    selector: z.string().describe("CSS selector for the element to click"),
  }),
  execute: async ({ selector }) => {
    const page = await (await require_browser()).get_page();
    try {
      await page.click(selector, { timeout: 5000 });
      return `Successfully clicked element: ${selector}`;
    } catch (e) {
      throw new UserError(`Error clicking element ${selector}: ${e}`);
    }
  },
};

let scraping_browser_links = {
  name: "scraping_browser_links",
  description: [
    "Get all links on the current page, text and selectors",
    "It's strongly recommended that you call the links tool to check that " +
      "your click target is valid",
  ].join("\n"),
  parameters: z.object({}),
  execute: async () => {
    const browser = require_browser();
    const page = await browser.get_page();
    try {
      // Check if page is still valid before proceeding
      await page.evaluate(() => document.readyState);
      const links = await page.$$eval("a", (elements) => {
        return elements.map((el) => {
          return {
            text: el.innerText,
            href: el.href,
            selector: el.outerHTML,
          };
        });
      });
      return JSON.stringify(links, null, 2);
    } catch (e) {
      // If page is invalid, get a new page and try again
      await browser.close();
      const newPage = await browser.get_page();
      const links = await newPage.$$eval("a", (elements) => {
        return elements.map((el) => {
          return {
            text: el.innerText,
            href: el.href,
            selector: el.outerHTML,
          };
        });
      });
      return JSON.stringify(links, null, 2);
    }
  },
};

let scraping_browser_type = {
  name: "scraping_browser_type",
  description: "Type text into an element",
  parameters: z.object({
    selector: z.string().describe("CSS selector for the element to type into"),
    text: z.string().describe("Text to type"),
    submit: z
      .boolean()
      .optional()
      .describe("Whether to submit the form after typing (press Enter)"),
  }),
  execute: async ({ selector, text, submit }) => {
    const page = await (await require_browser()).get_page();
    try {
      await page.fill(selector, text);
      if (submit) await page.press(selector, "Enter");
      return (
        `Successfully typed "${text}" into element: ` +
        `${selector}${submit ? " and submitted the form" : ""}`
      );
    } catch (e) {
      throw new UserError(`Error typing into element ${selector}: ${e}`);
    }
  },
};

let scraping_browser_wait_for = {
  name: "scraping_browser_wait_for",
  description: "Wait for an element to be visible on the page",
  parameters: z.object({
    selector: z.string().describe("CSS selector to wait for"),
    timeout: z
      .number()
      .optional()
      .describe("Maximum time to wait in milliseconds (default: 30000)"),
  }),
  execute: async ({ selector, timeout }) => {
    const page = await (await require_browser()).get_page();
    try {
      await page.waitForSelector(selector, { timeout: timeout || 30000 });
      return `Successfully waited for element: ${selector}`;
    } catch (e) {
      throw new UserError(`Error waiting for element ${selector}: ${e}`);
    }
  },
};

let scraping_browser_screenshot = {
  name: "scraping_browser_screenshot",
  description: "Take a screenshot of the current page",
  parameters: z.object({
    full_page: z
      .boolean()
      .optional()
      .describe(
        [
          "Whether to screenshot the full page (default: false)",
          "You should avoid fullscreen if it's not important, since the " +
            "images can be quite large",
        ].join("\n")
      ),
  }),
  execute: async ({ full_page = false }) => {
    const page = await (await require_browser()).get_page();
    try {
      const buffer = await page.screenshot({ fullPage: full_page });
      return imageContent({ buffer });
    } catch (e) {
      throw new UserError(`Error taking screenshot: ${e}`);
    }
  },
};

let scraping_browser_get_html = {
  name: "scraping_browser_get_html",
  description:
    "Get the HTML content of the current page. Avoid using the " +
    "full_page option unless it is important to see things like script tags " +
    "since this can be large",
  parameters: z.object({
    full_page: z
      .boolean()
      .optional()
      .describe(
        [
          "Whether to get the full page HTML including head and script tags",
          "Avoid this if you only need the extra HTML, since it can be " +
            "quite large",
        ].join("\n")
      ),
  }),
  execute: async ({ full_page = false }) => {
    const page = await (await require_browser()).get_page();
    try {
      if (!full_page) return await page.$eval("body", (body) => body.innerHTML);
      const html = await page.content();
      if (!full_page && html)
        return html.split("<body>")[1].split("</body>")[0];
      return html;
    } catch (e) {
      throw new UserError(`Error getting HTML content: ${e}`);
    }
  },
};

let scraping_browser_get_text = {
  name: "scraping_browser_get_text",
  description: "Get the text content of the current page",
  parameters: z.object({}),
  execute: async () => {
    const page = await (await require_browser()).get_page();
    try {
      return await page.$eval("body", (body) => body.innerText);
    } catch (e) {
      throw new UserError(`Error getting text content: ${e}`);
    }
  },
};

let scraping_browser_activation_instructions = {
  name: "scraping_browser_activation_instructions",
  description: "Instructions for activating the scraping browser",
  parameters: z.object({}),
  execute: async () => {
    return (
      "You need to run this MCP server with the BROWSER_AUTH " +
      "environment varialbe before the browser tools will become " +
      "available"
    );
  },
};

let scraping_browser_press = {
  name: "scraping_browser_press",
  description: "Press a key on the current page",
  parameters: z.object({
    key: z
      .string()
      .describe("The key to press (e.g., 'Enter', 'Tab', 'Escape')"),
  }),
  execute: async ({ key }) => {
    const browser = require_browser();
    const page = await browser.get_page();
    try {
      // Check if page is still valid before proceeding
      await page.evaluate(() => document.readyState);
      await page.keyboard.press(key);
      return `Successfully pressed key: ${key}`;
    } catch (e) {
      // If page is invalid, get a new page and try again
      await browser.close();
      const newPage = await browser.get_page();
      await newPage.keyboard.press(key);
      return `Successfully pressed key: ${key}`;
    }
  },
};

export const browser_tools = browser_auth
  ? [
      scraping_browser_navigate,
      scraping_browser_go_back,
      scraping_browser_go_forward,
      scraping_browser_links,
      scraping_browser_click,
      scraping_browser_type,
      scraping_browser_wait_for,
      scraping_browser_screenshot,
      scraping_browser_get_text,
      scraping_browser_get_html,
      scraping_browser_press,
    ]
  : [scraping_browser_activation_instructions];
