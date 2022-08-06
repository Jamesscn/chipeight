#include <iostream>
#include <fstream>
#include <vector>

using namespace std;

int charToHex(char c) {
    if(c <= '9') {
        return c - '0';
    }
    return c - 'a' + 10;
}

int stringToHex(string str) {
    int result = 0;
    int factor = 1;
    for(int i = str.length() - 1; i >= 0; i--) {
        if(str[i] == 'x') {
            break;
        }
        result += charToHex(str[i]) * factor;
        factor *= 16;
    }
    return result;
}

int getOpcode(vector<string> tokens) {
    if(tokens[0] == "cls") {
        return 0x00e0;
    } else if (tokens[0] == "ret") {
        return 0x00ee;
    } else if (tokens[0] == "sys") {
        return stringToHex(tokens[1]);
    } else if (tokens[0] == "jmp" || tokens[0] == "jp") {
        if(tokens[1][0] == 'v') {
            return 0xB000 | stringToHex(tokens[2]);
        } else {
            return 0x1000 | stringToHex(tokens[1]);
        }
    } else if (tokens[0] == "call") {
        return 0x2000 | stringToHex(tokens[1]);
    } else if (tokens[0] == "se") {
        if(tokens[2][0] == 'v') {
            return 0x5000 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4; //make V0-VF in disassembler pls
        } else {
            return 0x3000 | charToHex(tokens[1][1]) << 8 | stringToHex(tokens[2]); //make V0-VF in disassembler pls
        }
    } else if (tokens[0] == "sne") {
        if(tokens[2][0] == 'v') {
            return 0x9000 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
        } else {
            return 0x4000 | charToHex(tokens[1][1]) << 8 | stringToHex(tokens[2]);
        }
    } else if (tokens[0] == "lea" || tokens[0] == "mov" || tokens[0] == "ld") {
        if(tokens[1][0] == 'i') {
            return 0xA000 | stringToHex(tokens[2]);
        } else if (tokens[1][0] == 'd') {
            return 0xF015 | charToHex(tokens[2][1]) << 8;
        } else if (tokens[1][0] == 's') {
            return 0xF018 | charToHex(tokens[2][1]) << 8;
        } else if (tokens[1][0] == 'f') {
            return 0xF029 | charToHex(tokens[2][1]) << 8;
        } else if (tokens[1][0] == 'b') {
            return 0xF033 | charToHex(tokens[2][1]) << 8;
        } else if (tokens[1][0] == '[') {
            return 0xF055 | charToHex(tokens[2][1]) << 8;
        } else {
            if(tokens[2][0] == 'd') {
                return 0xF007 | charToHex(tokens[1][1]) << 8;
            } else if (tokens[2][0] == 'k') {
                return 0xF00A | charToHex(tokens[1][1]) << 8;
            } else if (tokens[2][0] == '[') {
                return 0xF065 | charToHex(tokens[1][1]) << 8;
            } else if (tokens[2][0] == 'v') {
                return 0x8000 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
            } else {
                return 0x6000 | charToHex(tokens[1][1]) << 8 | stringToHex(tokens[2]);
            }
        }
    } else if (tokens[0] == "add") {
        if(tokens[1][0] == 'i') {
            return 0xF01E | charToHex(tokens[2][1]) << 8;
        } else if (tokens[2][0] == 'v') {
            return 0x8004 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
        } else {
            return 0x7000 | charToHex(tokens[1][1]) << 8 | stringToHex(tokens[2]);
        }
    } else if (tokens[0] == "or") {
        return 0x8001 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "and") {
        return 0x8002 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "xor") {
        return 0x8003 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "sub") {
        return 0x8005 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "shr") {
        return 0x8006 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "subn") {
        return 0x8007 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "shl") {
        return 0x800E | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4;
    } else if (tokens[0] == "rand" || tokens[0] == "rnd") {
        return 0xC000 | charToHex(tokens[1][1]) << 8 | stringToHex(tokens[2]);
    } else if (tokens[0] == "draw" || tokens[0] == "drw") {
        return 0xD000 | charToHex(tokens[1][1]) << 8 | charToHex(tokens[2][1]) << 4 | stringToHex(tokens[3]);
    } else if (tokens[0] == "skip" || tokens[0] == "skp") {
        return 0xE09E | charToHex(tokens[1][1]) << 8;
    } else if (tokens[0] == "sknp") {
        return 0xE0A1 | charToHex(tokens[1][1]) << 8;
    } else {
        return stringToHex(tokens[1]);
    }
}

void parseLine(string line) {
    vector<string> tokens;
    string current = "";
    for(int i = 0; i < line.length(); i++) {
        if(line[i] == ' ' || line[i] == ',' || line[i] == '\t') {
            if(current.length() > 0) {
                tokens.push_back(current);
                current = "";
            }
        } else {
            if(line[i] >= 'A' && line[i] <= 'Z') {
                current += line[i] + ' ';
            } else {
                current += line[i];
            }
        }
    }
    tokens.push_back(current);
    int opcode = getOpcode(tokens);
    char a = opcode & 0xFF;
    char b = (opcode >> 8) & 0xFF;
    cout << b << a;
}

int main(int argc, char** argv) {
    if(argc < 2) {
        string line;
        while (getline(cin, line)){
            parseLine(line);
        }
    } else if (argc == 2) {
        ifstream asmFile;
        asmFile.open(argv[1]);
        if(asmFile.is_open()) {
            string line;
            while (getline(asmFile, line)){
                parseLine(line);
            }
            asmFile.close();
        }
    } else {
        cerr << "Syntax: " << argv[0] << " file.asm" << endl;
        exit(1);
    }
}