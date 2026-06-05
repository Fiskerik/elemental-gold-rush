import { useEffect, useRef } from "react";
import {
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
      return Boolean(element.closest("[data-no-localize]"));
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

    function localizeTree(start: Node) {
      if (start.nodeType === Node.TEXT_NODE) {
        localizeTextNode(start as Text);
        return;
      }
      if (!(start instanceof Element) || shouldSkipElement(start)) return;
      localizeAttributes(start);
      const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        localizeTextNode(current as Text);
        current = walker.nextNode();
      }
      for (const element of start.querySelectorAll("*")) {
        localizeAttributes(element);
      }
    }

    restoreKnownNodes();
    document.documentElement.lang = toIntlLocale(language);
    document.documentElement.dir = getLanguageDirection(language);
    localizeTree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          localizeTextNode(mutation.target as Text);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          localizeAttributes(mutation.target);
          continue;
        }
        for (const addedNode of mutation.addedNodes) {
          localizeTree(addedNode);
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
      restoreKnownNodes();
    };
  }, [language]);
}
