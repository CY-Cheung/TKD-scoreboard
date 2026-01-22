# Coding Guidelines

## JavaScript String Escaping

When checking for a backslash character in a JavaScript string, always escape the backslash.

**Correct:**
```javascript
if (e.key === "\\") {
  // ...
}
```

**Incorrect:**
```javascript
if (e.key === "\") { // This will cause a syntax error
  // ...
}
```

---

## General Development Rules

*   **Language:** We will communicate in Cantonese, but the application's User Interface (UI) must remain in English.
*   **UI Consistency:**
    *   When modifying existing code, please preserve the original UI without making changes.
    *   When adding new pages, please ensure their UI is consistent with other pages in the project (e.g., `DataImport.jsx`).

---

# 編碼規範

## JavaScript 字串跳脫字元

當你在 JavaScript 字串中檢查反斜線 (`\`) 字元時，必須使用跳脫字元。

**正確寫法：**
```javascript
if (e.key === "\\") {
  // ...
}
```

**錯誤寫法：**
```javascript
if (e.key === "\") { // 這會導致語法錯誤
  // ...
}
```

---

## 開發通用守則

*   **溝通語言與介面語言**: 我地用粵語溝通，但我嘅UI保持用英文。
*   **UI 一致性**:
    *   如果要改code，請保持原有UI唔改動。
    *   如果要新增頁面，請同我其他頁面UI一致，例如 `DataImport.jsx`。
