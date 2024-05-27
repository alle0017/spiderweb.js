export default class MDParser {
      
      text;
      #headers = {};

      /**@param {string} text */
      constructor( text ) {
            this.text = text;
      }
      /**@param {string} text */
      #toKebabCase( text ){
            return text
                  .trim()
                  .toLowerCase()
                  .split(' ')
                  .reduce( (p,v) => p += `-${v}` );
      }
      /**@param {string} text */
      #replaceHashTags(text){
            const n = text.match(/#/ig).length;
            const internal = text.replaceAll('#', '');

            let anchor = this.#toKebabCase(internal);
            let anchorDeclaration = text.match(/{#.*}/);

            if( anchorDeclaration ){
                  anchor = anchorDeclaration[0];
            }
            if( this.#headers[anchor] ){
                  anchor += `-${this.#headers[anchor]}`;
                  this.#headers[anchor]++;
            }else{
                  this.#headers[anchor] = 1;
            }
            return `<h${n}><a name="#${anchor}">${internal.trim()}</a></h${n}>`
      }

      #replaceBlockQuotes(){
            const lines = this.text.split('\n')
            
            let text = '';
            let level = 0;

            for( const line of lines ){
                  let i = 0;
                  while( line[i] == '>' ){
                        i++;
                  }
                  if( !i && !level ){
                        text += line + '\n';
                        continue;
                  }
                  if( i > level ){
                        level = i;
                        i++;
                        text += '<blockquote>';
                  }else if( i < level ){
                        level = i;
                        text += '</blockquote><br/>';
                  }
                  
                  text += line.slice( i ) + '\n';
            }
            this.text = text;
            return this;
      }
      #replaceTableDef(){
            const lines = this.text.split('\n')
            
            let text = '';
            let table = false;

            for( let i = 0; i < lines.length; i++ ){
                  if( lines[i].match(/\|?(.*\|)+.*\|?/) ){
                        let type = 'td';
                        if( !table ){
                              table = true;
                              text += '<table>';
                        }
                        if( lines[i+1].match(/\|?( *:? *---+ *:? *\|)+ *:? *---+ *:? *\|?/) ){
                              type = 'th'
                              lines.splice( i + 1, 1 );
                        }
                        text += `<tr>${lines[i]
                        .split('|')
                        .reduce( ( p, v )=> {
                              if( !v.replace( ' ','' ))
                                    return p
                              return p += `<${type}>${v}</${type}>`
                        })}</tr>`
                        continue;
                  }
                  if( table ){
                        table = false;
                        text += '</table>'
                  }
                  text += lines[i] + '\n';
            }
            this.text = text;
            return this;
      }
      /**@param {string} text  */
      #replaceLink(text){
            const aText = text.match(/\[.*\]/)[0];
            const aLink = text.match(/\(.*\)/)[0];
            return `<a href="${aLink.slice( 1, aLink.length - 1 )}">${aText.slice( 1, aText.length - 1 )}</a>`;
      }
      /**@param {string} text  */
      #replaceImage(text){
            const imgText = text.match(/\[.*\]/)[0];
            const imgLink = text.match(/\(.*\)/)[0];
            return `<img src="${imgLink.slice( 1, imgLink.length - 1 )}">${imgText.slice( 1, imgText.length - 1 )}</img>`;
      }
      /**@param {string} text  */
      #replaceFootnotes(){
            const lines = this.text.split('\n');
            const anchors = {};

            let text = '';
            let idx = 0;
            

            const getAnchorRef = ( text )=> text.slice( 2, text.indexOf(']') )

            for ( let i = 0; i < lines.length; i++ ){

                  if( !lines[i].match( /\[\^.*]: .*/ig ) )
                        continue;

                  const name = getAnchorRef( lines[i].match( /\[\^.*]: .*/ig )[0] )
                  let def = '';

                  
                  
                  while( i < lines.length && !lines[i].match(/^(\t| |\b)+/ig) ){
                        def += lines[i];
                        lines.splice( i, 1 );

                  }
                  def = def.replace(/\[\^.*]:/ig, '')
                  idx++;
                  i--;

                  anchors[name] = {
                        def,
                        idx,
                        backref: 0,
                  }
                  
            }
            for ( let i = 0; i < lines.length; i++ ){
                  if( !lines[i].match( /\[\^.*]/ig ) ){
                        text += lines[i] + '\n';
                        continue;
                  }
                  for( let j = 0; j < lines[i].length; j++ ){
                        if( lines[i][j] != '[' || lines[i][j+1] != '^' ){
                              text += lines[i][j];
                              continue;
                        }
                        const noteName = getAnchorRef( lines[i].slice( j , lines[i].indexOf(']', j) + 1 ) );
                        
                        text += `<sup><a name="#--footnote-anchor-${anchors[noteName].backref}-backref" href="#--footnote-anchor-${anchors[noteName].idx}" >${anchors[noteName].idx}</a></sup>`
                        anchors[noteName].backref++;

                        j = lines[i].indexOf(']', j);         

                  }
                  text += '\n';
            }     
            const li = Object.values( anchors ).sort( (a,b)=> a.idx - b.idx );

            if( li.length > 0 ){

                  text += '<ul>'
                  for( const v of li ){
                        text += `<li>
                              <a name="#--footnote-anchor-${v.idx}">${v.idx}</a>. ${v.def} `
                        for( let j = 0; j < v.backref; j++ ){
                              text += `<a href="#--footnote-anchor-${j}-backref">&#8617;</a>`
                        }
                        text += '</li>'
                  }
                  text += '</ul>'
            }
            
            this.text = text;

            return this;
      }
      #getIndentation( line ){
            for( let i = 0; i < line.length; i++ ){
                  if( line[i] !== ' ' && line[i] !== '\t' )
                        return i;
            }
            return 0;
      }
      #replaceLists(){
            const lines = this.text.split('\n');
            const stack = [];
            
            let text = '';
            
            for( let i = 0; i < lines.length; i++ ){
                  if( lines[i].match( /(-|\*|\+) /ig ) ){
                        
                        const j = this.#getIndentation( lines[i] );
                        if( !stack.length || j > stack[ stack.length - 1 ].indentation ){
                              if( stack.length )
                                    text+= '<li><br/>'
                              stack.push({
                                    list: 'ul',
                                    indentation: j
                              });
                              
                              text += '<ul>';
                        }
                        if( stack.length && j < stack[ stack.length - 1 ].indentation || stack[ stack.length - 1 ].list != 'ul' ){
                              let last = stack.pop();
                              while( last && last.indentation > j ){
                                    text += `</${last.list}>`;
                                    if( stack.length ){
                                          text += '</li>'
                                    }
                                    last = stack.pop();
                              }
                              if( last )
                                    stack.push( last );
                        }
                        text += `<li>${lines[i].replace(/(\t| )*(-|\*|\+)/ig, '')}</li>`;
                        
                  }else if( lines[i].match( /[0-9]+\. /ig ) ){
                        const j = this.#getIndentation( lines[i] );
                        if( !stack.length || j > stack[ stack.length - 1 ].indentation ){
                              if( stack.length )
                                    text+= '<li><br/>'
                              stack.push({
                                    list: 'ol',
                                    indentation: j
                              });
                              
                              text += '<ol>';
                        }
                        if( stack.length && j < stack[ stack.length - 1 ].indentation || stack[ stack.length - 1 ].list != 'ul' ){
                              let last = stack.pop();
                              while( last && last.indentation > j ){
                                    text += `</${last.list}>`;
                                    if( stack.length ){
                                          text += '</li>'
                                    }
                                    last = stack.pop();
                              }
                              if( last )
                                    stack.push( last );
                        }
                        text += `<li>${lines[i].replace(/(\t| )*[0-9]+\. /ig, '')}</li>`;
                        
                  }else{
                        if( stack.length ){
                              let last = stack.pop();
                              while( last ){
                                    text += `</${last.list}>`;
                                    last = stack.pop();
                              }
                        }
                        text += lines[i] + '\n';
                  }
            }
            this.text = text;
            return this;
      }
      toHTML() {

            this
            .#replaceFootnotes()
            .#replaceLists()
            .#replaceBlockQuotes()
            .#replaceTableDef()

            return this.text
            .replace(/\n/, '<br/>')
            .replace(/!\[.*\]\(.*\)/ig, this.#replaceImage.bind(this) )
            .replace(/\[.*\]\(.*\)/ig, this.#replaceLink.bind(this) )
            .replace(/(?!\\)(\*|_){3}.*(\*|_){3}/ig, match => `<b><i>${match.slice( 3, match.length - 3 )}</i></b>` )
            .replace(/(?!\\)(\*|_){2}.*(\*|_){2}/ig, match => `<b>${match.slice( 2, match.length - 2 )}</b>` )
            .replace(/(?!\\)(\*|_)*.(\*|_)/ig, match => `<i>${match.slice( 1, match.length - 1 )}</i>` )
            .replace(/(?!\\)(\*|_){3}/ig, '<hr/>' )
            .replace(/(?!\\)~{2}.*~{2}/ig, match => `<del>${match.slice( 2, match.length - 2 )}</del>`)
            .replace(/(?!\\)~.*~/ig, match => `<sub>${match.slice( 1, match.length - 1 )}</sub>`)
            .replace(/(?!\\)\^.*\^/ig, match => `<sup>${match.slice( 1, match.length - 1 )}</sup>`)
            .replace(/(?!\\)={2}.*={2}/ig, match => `<mark>${match.slice( 2, match.length - 2 )}</mark>` )
            .replace( /#+ .*/ig, this.#replaceHashTags.bind(this) )
            .replace(/(?!\\)\[ ]/ig, `<input type="checkbox" disabled="true" checked="false"/>`)
            .replace(/(?!\\)\[x]/ig, `<input type="checkbox" disabled="true" checked="true"/>`)
      }
}