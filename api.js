import { createCustomElement } from "./sw/custom-element.js";
import MDParser from "./sw/md.js";


/**
 * @typedef {Object} ElementDescriptor
 * @property {string} template
 * @property {string} name
 * @property {Object.<string, any> & HTMLElement } props
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
 * create new component
 * @param {string} name
 * @returns {HTMLCustomElement}
 */
export const create = (name)=>{
      return CustomElementRegistry.create(name);
}
/**
 * create and append new component
 * @param {string} name
 * @param {Record<string,string>} props
 * @param {HTMLElement} node
 * @returns {HTMLCustomElement | undefined}
 */
export const append = (name, props = {}, node = document.body)=>{
      const el = CustomElementRegistry.create(name);
      if( !el ) return;
      node.appendChild(el);
      for( let [k,v] of Object.entries(props) ){
            if( v instanceof Array )
                  el.setArray(k,v);
            else
                  el.setAttribute(k,v);
      }
      return el;
}
