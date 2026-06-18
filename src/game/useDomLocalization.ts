import { useEffect, useRef } from "react";
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  toIntlLocale,
  translateText,
  type AppLanguage,
} from "./localization";

const SKIP_TAGS = new Set([
  "CODE",
  "INPUT",
  "OPTION",
  "PRE",
  "SCRIPT",
  "SELECT",
  "STYLE",
  "TEXTAREA",
]);

const SKIP_SELECTOR = [
  "[data-no-localize]",
  "[contenteditable='']",
  "[contenteditable='true']",
  "input",
  "option",
  "select",
  "textarea",
].join(",");

const LOCALIZABLE_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"] as const;
type LocalizableAttribute = (typeof LOCALIZABLE_ATTRIBUTES)[number];
type AttributeOriginals = Partial<Record<LocalizableAttribute, string>>;

export function useDomLocalization(language: AppLanguage) {
  const textOriginalsRef = useRef(new WeakMap<Text, string>());
  const trackedTextNodesRef = useRef(new Set<Text>());
  const attributeOriginalsRef = useRef(new WeakMap<Element, AttributeOriginals>());
  const trackedAttributeElementsRef = useRef(new Set<Element>());

  useEffect(() => {
    const root = document.getElementById("root") ?? document.body;
    const textOriginals = textOriginalsRef.current;
    const trackedTextNodes = trackedTextNodesRef.current;
    const attributeOriginals = attributeOriginalsRef.current;
    const trackedAttributeElements = trackedAttributeElementsRef.current;

    function restoreKnownNodes() {
      for (const node of trackedTextNodes) {
        const original = textOriginals.get(node);
        if (original != null && node.isConnected) node.data = original;
      }
      for (const element of trackedAttributeElements) {
        const originals = attributeOriginals.get(element);
        if (!originals || !element.isConnected) continue;
        for (const attribute of LOCALIZABLE_ATTRIBUTES) {
          const original = originals[attribute];
          if (original != null) element.setAttribute(attribute, original);
        }
      }
    }

    function shouldSkipElement(element: Element | null): boolean {
      if (!element) return true;
      if (SKIP_TAGS.has(element.tagName)) return true;
      return Boolean(element.closest(SKIP_SELECTOR));
    }

    function shouldSkipNode(node: Node): boolean {
      if (node.nodeType === Node.TEXT_NODE) return shouldSkipElement(node.parentElement);
      return !(node instanceof Element) || shouldSkipElement(node);
    }

    function localizeTextNode(node: Text) {
      if (shouldSkipElement(node.parentElement)) return;
      const previousOriginal = textOriginals.get(node);
      if (previousOriginal == null) {
        textOriginals.set(node, node.data);
        trackedTextNodes.add(node);
      } else {
        const expected = translateText(previousOriginal, language);
        if (node.data !== previousOriginal && node.data !== expected) {
          textOriginals.set(node, node.data);
        }
      }
      const original = textOriginals.get(node);
      if (original == null) return;
      const translated = translateText(original, language);
      if (node.data !== translated) node.data = translated;
    }

    function localizeAttributes(element: Element) {
      if (shouldSkipElement(element)) return;
      const previous = attributeOriginals.get(element) ?? {};
      let next: AttributeOriginals | null = null;
      for (const attribute of LOCALIZABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        const previousOriginal = previous[attribute];
        const original =
          previousOriginal != null &&
          (current === previousOriginal || current === translateText(previousOriginal, language))
            ? previousOriginal
            : current;
        const translated = translateText(original, language);
        if (current !== translated) element.setAttribute(attribute, translated);
        next = { ...(next ?? previous), [attribute]: original };
      }
      if (next) {
        attributeOriginals.set(element, next);
        trackedAttributeElements.add(element);
      }
    }

    function localizeElementAttributes(start: Element) {
      localizeAttributes(start);
      for (const element of start.querySelectorAll(`*:not(${SKIP_SELECTOR})`)) {
        localizeAttributes(element);
      }
    }

    function localizeTree(start: Node) {
      if (start.nodeType === Node.TEXT_NODE) {
        localizeTextNode(start as Text);
        return;
      }
      if (!(start instanceof Element) || shouldSkipElement(start)) return;
      localizeElementAttributes(start);
      const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        localizeTextNode(current as Text);
        current = walker.nextNode();
      }
    }

    restoreKnownNodes();
    document.documentElement.lang = toIntlLocale(language);
    document.documentElement.dir = getLanguageDirection(language);
    if (language === DEFAULT_LANGUAGE) return;

    localizeTree(root);

    const pendingNodes = new Set<Node>();
    let animationFrameId: number | null = null;

    function flushPendingNodes() {
      animationFrameId = null;
      const nodes = Array.from(pendingNodes);
      pendingNodes.clear();
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.parentElement?.isConnected) localizeTextNode(node as Text);
          continue;
        }
        if (node instanceof Element && node.isConnected) localizeTree(node);
      }
    }

    function queueLocalization(node: Node) {
      if (shouldSkipNode(node)) return;
      for (let ancestor = node.parentNode; ancestor; ancestor = ancestor.parentNode) {
        if (pendingNodes.has(ancestor)) return;
      }
      if (node instanceof Element) {
        for (const pendingNode of pendingNodes) {
          if (pendingNode !== node && node.contains(pendingNode)) pendingNodes.delete(pendingNode);
        }
      }
      pendingNodes.add(node);
      if (animationFrameId == null) {
        animationFrameId = window.requestAnimationFrame(flushPendingNodes);
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          queueLocalization(mutation.target);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          queueLocalization(mutation.target);
          continue;
        }
        for (const addedNode of mutation.addedNodes) {
          queueLocalization(addedNode);
        }
      }
    });

    observer.observe(root, {
      attributeFilter: [...LOCALIZABLE_ATTRIBUTES],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (animationFrameId != null) window.cancelAnimationFrame(animationFrameId);
      pendingNodes.clear();
      restoreKnownNodes();
    };
  }, [language]);
}
