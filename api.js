import { createCustomElement } from "./sw/custom-element.js";
import MDParser from "./sw/md.js";
import { include, imports } from "./sw/ui.js";
import { Router } from "./sw/router.js";

/**
 * @typedef {Object} ElementDescriptor
 * @property {string} template
 * @property {string} name
 * @property {Object.<string, any> & import("./sw/custom-element.js").HTMLCustomElement } props
 * @property {boolean} markdown
 * @property {Array<string>} watched
 */

/**@param {ElementDescriptor} descriptor */
export const define = ( descriptor )=>{
      if( descriptor.markdown ){
            descriptor.template = new MDParser(descriptor.template).toHTML();
      }
      createCustomElement(
            descriptor.name,
            descriptor.template,
            descriptor.props,
            descriptor.watched
      );
}

/**
 * # ⚠ deprecation warning
 * create and append new component
 * @param {string} name
 * @param {Record<string,any>} props
 * @param {HTMLElement} node
 * @deprecated
 */
export const append = (name, props = {}, node = document.body)=>{
      
}

/**
 * create a new custom element
 * @param {string} componentName 
 * @param {HTMLElement} root 
 */
export const initialize = ( componentName, root = document.body ) => root.appendChild( document.createElement( componentName ) );

export { MDParser, include, imports, Router }