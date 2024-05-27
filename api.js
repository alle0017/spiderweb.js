import { createCustomElement } from "./sw/custom-element.js";
import MDParser from "./sw/md.js";
import { warning } from "./sw/parser.js";
/**
 * @typedef {Object} ElementDescriptor
 * @property {string} template
 * @property {string} name
 * @property {Object.<string, any> & HTMLElement } props
 * @property {boolean} markdown
 * @property {Array<string>} watched
 */
/**
 * 
 * @param {string} name 
 */
const checkNameValidity = ( name )=>{
      return name.match(/[-.\d_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]+-[-.\d_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]+/)
}
/**@param {ElementDescriptor} descriptor */
export const define = ( descriptor )=>{
      if( !checkNameValidity( descriptor.name ) ){
            warning(` name ${descriptor.name} is not a valid name. See https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name for the correct specifications`);
            return;
      }
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
//hello on spiderweb.js!!!