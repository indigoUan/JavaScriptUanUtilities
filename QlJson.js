/**
 * QlJson is a custom type of JSON that does not make use of double air quotes for variable names:  
 *   
 * JSON:  
 * {  
 * 	"foo": "bar",  
 * 	"length": 3  
 * }  
 *   
 * QlJson:  
 * {  
 * 	foo: "bar",  
 * 	length: 3  
 * }
 */

class QlJson {
	constructor(qljson, unknownValueIsSpacelessString = false) {
		this.map = QlJson.parse(qljson, unknownValueIsSpacelessString);
	}

	get(path) {
		let ns = path.split(".");
		if (ns.length === 1) {
			return this.map[ns[0]];
		}
		let cur = this.map[ns.shift()];
		while (ns.length > 0) {
			if (!cur) break;
			if (ns.length === 1) {
				return cur[ns.shift()];
			}
			cur = cur[ns.shift()];
		}
		return null;
	}

	has(path) {
		let ns = path.split(".");
		if (ns.length === 1) {
			return this.map.hasOwnProperty(ns[0]);
		}
		let cur = this.map[ns.shift()];
		while (ns.length > 0) {
			if (!cur) break;
			if (ns.length === 1) {
				return cur.hasOwnProperty(ns.shift());
			}
			cur = cur[ns.shift()];
		}
		return false;
	}

	static toStructure(map) {
		let dyn = {};
		for (let key in map) {
			if (typeof map[key] === 'string' || typeof map[key] === 'number' || typeof map[key] === 'boolean' || map[key] === null) {
				dyn[key] = map[key];
			} else {
				dyn[key] = QlJson.toStructure(map[key]);
			}
		}
		return dyn;
	}

	static parse(qljson, unknownValueIsSpacelessString = false) {
		return QlJson.parseValue(QlJson.fixString(qljson), unknownValueIsSpacelessString);
	}

	static build(qljson) {
		let json = "";
		let tabs = 0;
		for (let i in qljson) {
			let line = "\t".repeat(tabs);
			json += line + "\n";
		}
		return json.trim();
	}

	static fixString(str) {
		let done = "";

		let inString = false;
		let inComment = false;

		let i = 0;
		for (let charID = 0; charID < str.length; charID++) {
			let c = str.charAt(i);

			if (inString) {
				if (c === '\\') {
					let n = str.charAt(i + 1);
					if (n === "\\") {
						done += "\\";
					} else if (n === '"') {
						done += '\\"';
					} else if (n === "n") {
						done += "\n";
					} else if (n === "t") {
						done += "\t";
					} else if (n === "r") {
						done += "\r";
					} else if (n === "u") {
						done += QlJson.parseUnicode(str.substring(i + 1, i + 6));
						i += 4;
					} else if (n === "b" || n === "f") {
						throw new Error("special character (\\" + n + ") not supported");
					} else {
						throw new Error("not a real special character (\\" + n + ")");
					}
					i++;
				} else {
					done += c;
				}
				if (c === '"') {
					inString = false;
				}
			} else {
				if (c === '"') {
					inString = true;
					done += c;
				} else {
					if (done.charAt(done.length - 1) === "/" && c === "/") {
						inComment = true;
					}
					if (!inComment && ![" ", "\n", "\t", "\r"].includes(c)) {
						done += c;
					}
					if (inComment && c === "\n") {
						inComment = false;
					}
				}
			}

			i++;
		}

		if (inString) {
			throw new Error("String was left open");
		}

		return done;
	}

	static parseList(str) {
		let list = [];

		let mem = "";

		let inString = false;
		let inComment = false;

		let curly = 0;
		let square = 0;

		for (let i = 0; i < str.length; i++) {
			let c = str.charAt(i);

			if (inString) {
				if (c === '\\') {
					let n = str.charAt(i + 1);
					if (n === "\\") {
						mem += "\\";
					} else if (n === '"') {
						mem += '\\"';
					} else if (n === "n") {
						mem += "\n";
					} else if (n === "t") {
						mem += "\t";
					} else if (n === "r") {
						mem += "\r";
					} else if (n === "u") {
						mem += parseUnicode(str.substring(i + 1, i + 5));
						i += 4;
					} else if (n === "b" || n === "f") {
						throw new Error("special character (\\" + n + ") not supported");
					} else {
						throw new Error("not a real special character (\\" + n + ")");
					}
					i++;
				} else {
					mem += c;
				}
				if (c === '"') {
					inString = false;
				}
			} else {
				if (c === '"') {
					inString = true;
					mem += c;
				} else {
					if (c === "," && curly === 0 && square === 0) {
						list.push(mem.trim());
						mem = "";
					} else if (c === "{") {
						mem += c;
						curly++;
					} else if (c === "}") {
						mem += c;
						curly--;
					} else if (c === "[") {
						mem += c;
						square++;
					} else if (c === "]") {
						mem += c;
						square--;
					} else {
						mem += c;
					}
				}
			}
		}
		list.push(mem.trim());

		return list;
	}

	static parseValue(val, unknownValueIsSpacelessString) {
		let isNum = true;
		for (let i of val.split("")) {
			if (!["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "-"].includes(i)) {
				isNum = false;
				break;
			}
		}
		if (isNum) {
			if (val.includes(".")) {
				return parseFloat(val);
			} else {
				return parseInt(val);
			}
		}

		if (val.charAt(0) === "{" && val.charAt(val.length - 1) === "}") {
			val = val.substring(1, val.length - 1).trim();

			let args = QlJson.parseList(val);

			let toReturn = {};
			for (let arg = 0; arg < args.length; arg++) {
				let data = args[arg].trim().split(":");
				if (data.length > 1) {
					let name = data.shift().trim();
					toReturn[name] = QlJson.parseValue(data.join(":").trim(), unknownValueIsSpacelessString);
				} else {
					return null;
				}
			}

			return toReturn;
		}

		if (val.charAt(0) === "[" && val.charAt(val.length - 1) === "]") {
			val = val.substring(1, val.length - 1).trim();

			let args = QlJson.parseList(val);

			let toReturn = [];
			for (let arg = 0; arg < args.length; arg++) {
				toReturn.push(QlJson.parseValue(args[arg].trim(), unknownValueIsSpacelessString));
			}

			return toReturn;
		}

		if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
			return val.substring(1, val.length - 1).trim();
		}

		if (val === "true") {
			return true;
		}
		if (val === "false") {
			return false;
		}
		if (val === "null") {
			return null;
		}

		if (unknownValueIsSpacelessString) {
			return val;
		}

		throw new Error("invalid value (" + val + ")");
		return undefined;
	}	

	static parseUnicode(u) {
		let num = "";
		for (let i = 0; i < u.length; i++) {
			if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"].includes(u.charAt(i).toUpperCase())) {
				num += u.charAt(i);
			}
		}
		if (num.length === 4) {
			return String.fromCharCode(parseInt(num, 16));
		}

		throw new Error("Invalid unicode character (\\u" + num + ")");
		return "";
	}
	
}
