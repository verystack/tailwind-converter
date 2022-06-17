// https://github.com/scniro/react-codemirror2/issues/83
import React, { useState, useEffect } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/search/match-highlighter';
import parseCSS from 'css-rules';
import CSSLint from 'csslint';
import 'codemirror/mode/css/css';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/css-lint.js';
import _ from 'lodash';
import camelToKebabCase from "camel-to-kebab";
import {convertCss} from "../scripts/parser/parser";
import { expandWithMerge } from 'inline-style-expand-shorthand'
const dJSON = require('dirty-json');

if (typeof window !== `undefined`) {
    window.CSSLint = CSSLint.CSSLint;
}

const initialEditorOptions = {
    value: `
{
    height: "200px",
}
`,
    data: {},
    editor: {},
};


const parsez = (object) => {
    const errors = [];
    const styles = []

    Object.entries(expandWithMerge(object)).forEach(([key, value]) => {
        if (typeof value === "string") {
            const tailWindStyles = [];
            convertCss(camelToKebabCase(key), value, tailWindStyles, errors, {
                remConversion: 16,
                autoConvertSpacing: true,
                autoConvertColor: true,
            })
            if (tailWindStyles[0]) {
                styles.push(tailWindStyles[0])
            }
        } else {
            if (key.includes("@media") && value && typeof value === "object"){
                let constructedMediaClassName = ""
                if (key.includes("max-width")) {
                    constructedMediaClassName += "max"
                } else {
                    constructedMediaClassName += "min"
                }
                constructedMediaClassName += key.replace(/[^0-9.]/g, '');
                parsez(value).forEach((className) => {
                    styles.push(`${constructedMediaClassName}:${className}`)
                })
            } else if (key.includes("hover")) {
                parsez(value).forEach((className) => {
                    styles.push(`hover:${className}`)
                })
            } else if (key.includes("focus")) {
                parsez(value).forEach((className) => {
                    styles.push(`focus:${className}`)
                })

            } else if (key.includes("active")) {
                parsez(value).forEach((className) => {
                    styles.push(`active:${className}`)
                })

            } else if (key.includes("before")) {
                parsez(value).forEach((className) => {
                    styles.push(`before:${className}`)
                })

            } else if (key.includes("after")) {
                parsez(value).forEach((className) => {
                    styles.push(`after:${className}`)
                })
            }
        }
    })

    return styles
};

function objToString(styleObj) {
    if (!styleObj || typeof styleObj !== 'object' || Array.isArray(styleObj)) {
        console.error(`expected an argument of type object, but got ${typeof styleObj}`);
    }

    const lines = Object.entries(styleObj).map(([k, v]) => {
        return `${camelToKebabCase(k)}: ${v}`
    });
    return lines.join('\r\n');
}

const debouncedUpdateTree = _.debounce(
    (setCssTree, value, setEditorErrors, errors) => {
        try {
            setCssTree(parsez(dJSON.parse(value)));
            setEditorErrors(errors);
        } catch (e) {
            setEditorErrors("Object is malformed");
        }

    },
    500
);

const Editor = ({ setCssTree, setEditorErrors }) => {
    const [editorState, setEditorState] = useState(initialEditorOptions);


    return (
        <div className="relative h-full w-4/12">
            {typeof window !== 'undefined' && window.navigator && (
                <CodeMirror
                    value={editorState.value}
                    options={{
                        mode: 'json',
                        theme: 'material',
                        lineNumbers: true,
                        matchBrackets: true,
                        autoCloseBrackets: true,
                        gutters: ['CodeMirror-lint-markers'],
                        lint: true,
                    }}
                    onBeforeChange={(editor, data, value) => {
                        setEditorState({ editor, data, value });
                    }}
                    editorDidMount={(editor, [next]) => {
                        debouncedUpdateTree(
                            setCssTree,
                            initialEditorOptions.value,
                            setEditorErrors,
                            editor.state.lint.marked.length > 0
                        );
                    }}
                    onChange={(editor, data, value) => {
                        debouncedUpdateTree(
                            setCssTree,
                            value,
                            setEditorErrors,
                            editor.state.lint.marked.length > 0
                        );
                        // setCssTree(parse(value));
                        // setEditorErrors(editor.state.lint.marked.length > 0);
                        // console.log(editor, data, parse(value));
                    }}
                />
            )}
        </div>
    );
};

export default Editor;
