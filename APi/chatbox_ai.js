const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');
const dotenv = require("dotenv");
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const sessions = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [sid, data] of sessions.entries()) {
        if (now - data.lastActive > SESSION_TIMEOUT) {
            sessions.delete(sid);
        }
    }
}, 10 * 60 * 1000);

async function callGroq(systemPrompt, userPrompt, isJson = true, history = []) {
    try {
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userPrompt }
        ];

        const payload = {
            model: "llama-3.3-70b-versatile",
            max_tokens: 1024,
            messages
        };

        if (isJson) {
            payload.response_format = { type: "json_object" };
        }

        const res = await axios.post(GROQ_URL, payload, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content.trim();
    } catch (e) {
        console.error("Lỗi gọi API Groq:", e.response?.data || e.message);
        return null;
    }
}

async function analyzeIntent(userPrompt) {
    const systemPrompt = `Bạn là bộ não phân tích ý định cho shop thực phẩm.
        Chỉ trả về JSON hợp lệ theo đúng mẫu sau, KHÔNG thêm bất kỳ văn bản nào khác:
        {
            "main_intent": "GENERAL_KNOWLEDGE" | "SHOPPING_TASK",
            "sub_intent": "LIST_CAT" | "LIST_PRODUCT" | "LIST_PROD_BY_CAT" | 
                        "FIND_CHEAPEST" | "FIND_EXPENSIVE" | "BEST_DISCOUNT" | 
                        "SEARCH_PRODUCT_BY_NAME" | "PRICE_RANGE" | "RECOMMEND_PRODUCT" | 
                        "COMPARE_PRODUCTS" | "RECOMMEND_MEAL" | "LIST_SAUCES" | 
                        "LIST_PROD_BY_SAUCES" | "LIST_COMBOS" | "COMBO_DETAIL",
            "category_name": "",
            "product_name": "",
            "product_names": [],
            "combo_name": "",
            "max_price": 0,
            "min_price": 0,
            "keyword": "",
            "limit": 5,
            "meal_time": "",
            "target_item_id": 0
        }

        Quy tắc phân loại:

        [GENERAL_KNOWLEDGE]
        - Hỏi kiến thức: toán, code, lịch sử, khoa học, xã hội, chính trị
        - Chào hỏi, hỏi thăm
        - Câu hỏi không liên quan mua sắm

        [SHOPPING_TASK - sub_intent rules]
        - LIST_CAT: Hỏi danh sách danh mục (category).
        - LIST_COMBOS: Hỏi shop có những combo nào (VD: "shop có combo nào", "cho xem các combo", "liệt kê combo").
        - COMBO_DETAIL: Hỏi chi tiết 1 combo cụ thể có những sản phẩm gì (VD: "combo A có gì", "combo X gồm những món nào"). Điền tên combo vào "combo_name".
        - LIST_PRODUCT: Dùng khi khách hỏi danh sách sản phẩm hoặc tìm COMBO theo số miếng gà.
            + Nếu khách nhắc đến từ "combo" kèm số miếng gà, trích xuất "target_item_id":
                * Combo có 1 miếng gà -> target_item_id: 1
                * Combo có 3 miếng gà -> target_item_id: 2
                * Combo có 6 miếng gà -> target_item_id: 3
                * Combo có Mỳ/Mì -> target_item_id: 51
            + Nếu khách KHÔNG nói từ "combo" mà chỉ hỏi mua lẻ (VD: "có bán 3 miếng gà không"):
                * Đặt target_item_id: 0
                * Trích xuất tên món vào "product_name"
        - LIST_SAUCES: hỏi danh sách sốt (product_sauces).
        - LIST_PROD_BY_SAUCES: Hỏi sản phẩm theo sốt.
        - LIST_PROD_BY_CAT: Hỏi sản phẩm theo danh mục, điền category_name.
        - SEARCH_PRODUCT_BY_NAME: Tìm sản phẩm cụ thể theo tên, điền product_name.
        - FIND_CHEAPEST: Tìm sản phẩm rẻ nhất.
        - FIND_EXPENSIVE: Tìm sản phẩm đắt nhất/cao cấp nhất.
        - BEST_DISCOUNT: Tìm sản phẩm giảm giá nhiều nhất.
        - PRICE_RANGE: Lọc theo khoảng giá, điền max_price/min_price.
        - RECOMMEND_PRODUCT: Gợi ý sản phẩm chung.
        - COMPARE_PRODUCTS: So sánh sản phẩm, điền danh sách vào product_names.
        - RECOMMEND_MEAL: Hỏi ăn gì theo thời gian (morning, noon, evening) hoặc thời tiết (sun, cloudy, rain).`;

    try {
        const rawJson = await callGroq(systemPrompt, userPrompt, true);
        if (!rawJson) return { main_intent: "GENERAL_KNOWLEDGE" };
        return JSON.parse(rawJson);
    } catch (e) {
        console.error("Lỗi parse intent JSON:", e.message);
        return { main_intent: "GENERAL_KNOWLEDGE" };
    }
}

async function handleChat(userPrompt, history = []) {
    try {
        const analysis = await analyzeIntent(userPrompt);
        console.log("Intent analysis:", JSON.stringify(analysis, null, 2));

        if (analysis.main_intent === "GENERAL_KNOWLEDGE") {
            return await callGroq(
                "Bạn là trợ lý ảo toàn năng của một shop thực phẩm. Hãy trả lời kiến thức chính xác, sâu sắc bằng tiếng Việt. Nếu khách hỏi code hãy dùng block code. Cuối câu trả lời có thể nhắc nhẹ về shop nếu phù hợp.",
                userPrompt,
                false,
                history 
            );
        }

        const limit = Math.max(1, Math.min(20, parseInt(analysis.limit) || 5));
        let message = "";

        switch (analysis.sub_intent) {

            case "LIST_CAT": {
                const [cats] = await db.execute("SELECT name FROM categories ORDER BY name");
                message = cats.length > 0
                    ? "🗂️ Danh mục hiện có tại shop:\n" + cats.map((c, i) => `${i + 1}. ${c.name}`).join("\n")
                    : "Hiện shop chưa có danh mục nào.";
                break;
            }

            case "LIST_COMBOS": {
                const [combos] = await db.execute(
                    `SELECT DISTINCT pro.name, 
                            COALESCE(NULLIF(pro.sale_price, 0), pro.list_price) AS price
                     FROM products pro
                     INNER JOIN combos cb ON pro.is_combo = 1 AND cb.product_id = pro.id
                     INNER JOIN combo_items cbi ON cbi.combo_id = cb.id
                     ORDER BY pro.name`
                );
                message = combos.length > 0
                    ? `🎁 Các combo hiện có tại shop:\n` +
                      combos.map((c, i) => `${i + 1}. ${c.name} - ${Number(c.price).toLocaleString()}đ`).join("\n") +
                      `\n\nBạn muốn biết chi tiết combo nào, hãy hỏi mình nhé! 😊`
                    : "Hiện shop chưa có combo nào.";
                break;
            }

            case "COMBO_DETAIL": {
                if (!analysis.combo_name) {
                    message = "Bạn muốn xem chi tiết combo nào? Hãy cho mình biết tên combo nhé!";
                    break;
                }
                const [comboRows] = await db.execute(
                    `SELECT pro.id, pro.name,
                            COALESCE(NULLIF(pro.sale_price, 0), pro.list_price) AS price
                     FROM products pro
                     INNER JOIN combos cb ON pro.is_combo = 1 AND cb.product_id = pro.id
                     WHERE pro.name LIKE ?
                     LIMIT 1`,
                    [`%${analysis.combo_name}%`]
                );

                if (comboRows.length === 0) {
                    message = `Xin lỗi, mình không tìm thấy combo "${analysis.combo_name}". Bạn thử hỏi "shop có combo nào" để xem danh sách nhé!`;
                    break;
                }
                const combo = comboRows[0];
                const [items] = await db.execute(
                    `SELECT p.name,
                            COALESCE(NULLIF(p.sale_price, 0), p.list_price) AS price,
                            cbi.quantity
                     FROM combos cb
                     INNER JOIN combo_items cbi ON cbi.combo_id = cb.id
                     INNER JOIN products p ON p.id = cbi.product_id
                     WHERE cb.product_id = ?`,
                    [combo.id]
                );
                if (items.length === 0) {
                    message = `Combo "${combo.name}" hiện chưa có thông tin chi tiết các món.`;
                    break;
                }
                message = `📦 Combo **${combo.name}** - ${Number(combo.price).toLocaleString()}đ bao gồm:\n` +
                    items.map((item, i) =>
                        `${i + 1}. ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`
                    ).join("\n");
                break;
            }

            case "LIST_PRODUCT": {
                const input = userPrompt.toLowerCase();
                const isAskingCombo = input.includes("combo");
                const numbersInInput = input.match(/\d+/g)?.map(Number) || [];
                const validQuantities = [1, 3, 6];
                if (isAskingCombo) {
                    const hasInvalidComboQty = numbersInInput.some(n => n === 3 || n === 6);
                    if (hasInvalidComboQty) {
                        message = "❌ Dạ hiện tại shop không bán combo nào có 3 miếng hay 6 miếng gà đâu ạ. Shop chỉ có combo cho loại 1 miếng gà thôi nhé!";
                    } else if (numbersInInput.includes(1)) {
                        // ✅ Dùng analysis.target_item_id thay vì hardcode
                        const targetId = analysis.target_item_id || 1;
                        const [combos] = await db.execute(
                            `SELECT pro.name, COALESCE(NULLIF(pro.sale_price, 0), pro.list_price) AS price
                             FROM products pro
                             INNER JOIN combos combo ON combo.product_id = pro.id
                             INNER JOIN combo_items cbItem ON cbItem.combo_id = combo.id
                             WHERE cbItem.product_id = ?`,
                            [targetId]
                        );
                        message = combos.length > 0
                            ? `🍗 Các COMBO có 1 miếng gà cho bạn đây:\n` +
                              combos.map((c, i) => `${i + 1}. ${c.name} - ${Number(c.price).toLocaleString()}đ`).join("\n")
                            : `Hiện tại shop chưa có sẵn combo 1 miếng gà ạ.`;
                    } else {
                        message = "Dạ combo gà bên shop hiện tại chỉ có loại 1 miếng thôi ạ!";
                    }
                } else if (numbersInInput.length > 0) {
                    const requestedValid = numbersInInput.filter(n => validQuantities.includes(n));
                    const requestedInvalid = numbersInInput.filter(n => !validQuantities.includes(n));

                    if (requestedInvalid.length > 0 && requestedValid.length === 0) {
                        message = `❌ Dạ shop không bán lẻ loại ${requestedInvalid.join(", ")} miếng đâu ạ. Shop chỉ bán lẻ loại 1, 3 và 6 miếng gà thôi!`;
                    } else if (requestedValid.length > 0) {
                        const queryParts = requestedValid.map(() => "name LIKE ?").join(" OR ");
                        const params = requestedValid.map(n => `%${n} miếng gà%`);
                        const [products] = await db.execute(
                            `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price 
                             FROM products WHERE ${queryParts}`,
                            params
                        );
                        let reply = `✅ Dạ có ạ! Shop có bán lẻ các loại ${requestedValid.join(", ")} miếng gà:\n`;
                        reply += products.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n");
                        if (requestedInvalid.length > 0) {
                            reply += `\n(Lưu ý: Loại ${requestedInvalid.join(", ")} miếng shop không có bán ạ)`;
                        }
                        message = reply;
                    }
                } else {
                    const [allProducts] = await db.execute(
                        "SELECT name FROM products ORDER BY name LIMIT ?",
                        [limit]
                    );
                    message = "🍔 Danh sách món tại shop:\n" +
                        allProducts.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
                }
                break;
            }

            case "LIST_SAUCES": {
                const [sauces] = await db.execute("SELECT DISTINCT name FROM product_sauces WHERE id != 6");
                message = sauces.length > 0
                    ? "🥫 Hiện tại shop có những loại sốt này:\n" + sauces.map((s, i) => `${i + 1}. ${s.name}`).join("\n")
                    : "Hiện shop chưa có loại sốt nào.";
                break;
            }

            case "LIST_PROD_BY_SAUCES": {
                const input = userPrompt.toLowerCase();
                const sauceMap = {
                    "hs": "hs",
                    "phô mai": "phô mai",
                    "pho mai": "phô mai",
                    "đậu": "đậu",
                    "dau": "đậu",
                    "k-chicken": "k-chicken",
                    "gochu": "gochu"
                };
                const keyword = Object.keys(sauceMap).find(key => input.includes(key));

                if (!keyword) {
                    message = "Bạn muốn tìm sản phẩm theo sốt nào? Shop có: HS, Phô mai, Đậu, K-Chicken, Gochu.";
                    break;
                }

                const dbSearchTerm = sauceMap[keyword];
                const [productsWithSauce] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products 
                     WHERE name LIKE ? OR name LIKE ?`,
                    [`%${dbSearchTerm}%`, `%${keyword}%`]
                );

                message = productsWithSauce.length > 0
                    ? `🍗 Các sản phẩm vị ${dbSearchTerm.toUpperCase()}:\n` +
                      productsWithSauce.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : `Dạ, hiện tại shop chưa có món nào thuộc vị "${dbSearchTerm}" ạ.`;
                break;
            }

            case "LIST_PROD_BY_CAT": {
                const [prodsByCat] = await db.execute(
                    `SELECT p.name, COALESCE(NULLIF(p.sale_price, 0), p.list_price) AS price
                     FROM products p
                     JOIN categories c ON p.category_id = c.id
                     WHERE c.name LIKE ? LIMIT ?`,
                    [`%${analysis.category_name}%`, limit]
                );
                message = prodsByCat.length > 0
                    ? `🛒 Các món thuộc nhóm "${analysis.category_name}":\n` +
                      prodsByCat.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : `Không tìm thấy sản phẩm nào trong danh mục "${analysis.category_name}".`;
                break;
            }

            case "SEARCH_PRODUCT_BY_NAME": {
                if (!analysis.product_name) {
                    message = "Bạn muốn tìm sản phẩm nào? Hãy cho mình biết tên nhé!";
                    break;
                }
                const [found] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products WHERE name LIKE ? LIMIT ?`,
                    [`%${analysis.product_name}%`, limit]
                );
                message = found.length > 0
                    ? `🔍 Tìm thấy ${found.length} sản phẩm:\n` +
                      found.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : `Xin lỗi, shop chưa có sản phẩm "${analysis.product_name}". Bạn có thể thử tên khác nhé!`;
                break;
            }

            case "FIND_CHEAPEST": {
                const [cheapest] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products ORDER BY price ASC LIMIT ?`,
                    [limit]
                );
                message = cheapest.length > 0
                    ? `💰 Top ${cheapest.length} sản phẩm giá rẻ nhất:\n` +
                      cheapest.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : "Không tìm thấy sản phẩm nào.";
                break;
            }

            case "FIND_EXPENSIVE": {
                const [expensive] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products ORDER BY price DESC LIMIT ?`,
                    [limit]
                );
                message = expensive.length > 0
                    ? `💎 Top ${expensive.length} sản phẩm cao cấp nhất:\n` +
                      expensive.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : "Không tìm thấy sản phẩm nào.";
                break;
            }

            case "BEST_DISCOUNT": {
                const [discounted] = await db.execute(
                    `SELECT name, list_price, sale_price,
                            ROUND((list_price - sale_price) / list_price * 100) AS discount_pct
                     FROM products
                     WHERE sale_price > 0 AND sale_price < list_price
                     ORDER BY discount_pct DESC LIMIT ?`,
                    [limit]
                );
                message = discounted.length > 0
                    ? `🏷️ Top ${discounted.length} sản phẩm đang giảm giá nhiều nhất:\n` +
                      discounted.map((p, i) =>
                          `${i + 1}. ${p.name} - ~~${Number(p.list_price).toLocaleString()}đ~~ còn ${Number(p.sale_price).toLocaleString()}đ (giảm ${p.discount_pct}%)`
                      ).join("\n")
                    : "Hiện không có sản phẩm nào đang giảm giá.";
                break;
            }

            case "PRICE_RANGE": {
                let priceQuery = `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price FROM products WHERE 1=1`;
                const priceParams = [];

                if (analysis.min_price > 0) {
                    priceQuery += ` AND COALESCE(NULLIF(sale_price, 0), list_price) >= ?`;
                    priceParams.push(analysis.min_price);
                }
                if (analysis.max_price > 0) {
                    priceQuery += ` AND COALESCE(NULLIF(sale_price, 0), list_price) <= ?`;
                    priceParams.push(analysis.max_price);
                }
                priceQuery += ` ORDER BY price ASC LIMIT ?`;
                priceParams.push(limit);

                const [range] = await db.execute(priceQuery, priceParams);
                const rangeLabel = analysis.min_price > 0 && analysis.max_price > 0
                    ? `từ ${Number(analysis.min_price).toLocaleString()}đ đến ${Number(analysis.max_price).toLocaleString()}đ`
                    : analysis.max_price > 0
                        ? `dưới ${Number(analysis.max_price).toLocaleString()}đ`
                        : `từ ${Number(analysis.min_price).toLocaleString()}đ trở lên`;

                message = range.length > 0
                    ? `💵 Sản phẩm ${rangeLabel}:\n` +
                      range.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : `Không có sản phẩm nào trong khoảng giá ${rangeLabel}.`;
                break;
            }

            case "RECOMMEND_PRODUCT": {
                const [featured] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products ORDER BY RAND() LIMIT ?`,
                    [limit]
                );
                message = featured.length > 0
                    ? `✨ Gợi ý hôm nay từ shop:\n` +
                      featured.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : "Hiện chưa có sản phẩm nào để gợi ý.";
                break;
            }

            case "COMPARE_PRODUCTS": {
                const names = analysis.product_names || [];
                if (names.length < 2) {
                    message = "Bạn muốn so sánh những sản phẩm nào? Hãy liệt kê ít nhất 2 tên sản phẩm nhé!";
                    break;
                }
                const placeholders = names.map(() => "name LIKE ?").join(" OR ");
                const likeParams = names.map(n => `%${n}%`);
                const [compared] = await db.execute(
                    `SELECT name, list_price, COALESCE(NULLIF(sale_price, 0), list_price) AS price, description
                     FROM products WHERE ${placeholders} LIMIT 10`,
                    likeParams
                );
                if (compared.length === 0) {
                    message = "Không tìm thấy sản phẩm nào để so sánh.";
                    break;
                }
                const productInfo = compared.map(p =>
                    `- ${p.name}: giá ${Number(p.price).toLocaleString()}đ${p.description ? ', ' + p.description : ''}`
                ).join("\n");
                message = await callGroq(
                    "Bạn là tư vấn viên shop thực phẩm. Hãy so sánh các sản phẩm sau một cách ngắn gọn, súc tích bằng tiếng Việt và đưa ra gợi ý phù hợp.",
                    `So sánh các sản phẩm:\n${productInfo}`,
                    false
                ) || `📊 Thông tin sản phẩm:\n${productInfo}`;
                break;
            }

            case "RECOMMEND_MEAL": {
                const mealMap = {
                    morning: { id: 1, label: "buổi sáng" },
                    noon: { id: 2, label: "buổi trưa" },
                    evening: { id: 3, label: "buổi tối" },
                    sun: { id: 4, label: "trời nắng" },
                    cloudy: { id: 5, label: "trời nhiều mây" },
                    rain: { id: 6, label: "trời mưa" }
                };
                const mealKey = analysis.meal_time?.toLowerCase();
                const meal = mealMap[mealKey];
                if (!meal) {
                    message = "Bạn muốn gợi ý cho bữa nào hoặc thời tiết nào? (sáng, trưa, tối, nắng, mưa...)";
                    break;
                }
                const [meals] = await db.execute(
                    `SELECT name, COALESCE(NULLIF(sale_price, 0), list_price) AS price
                     FROM products WHERE category_id = ? ORDER BY RAND() LIMIT ?`,
                    [meal.id, limit]
                );
                message = meals.length > 0
                    ? `🍽️ Thực đơn gợi ý cho ${meal.label}:\n` +
                      meals.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()}đ`).join("\n")
                    : `Hiện shop chưa có danh sách món cho ${meal.label}, bạn xem menu chung nhé!`;
                break;
            }
            default: {
                message = "Chào bạn! 👋 Mình có thể giúp:\n• Xem danh mục & sản phẩm\n• Xem các combo hiện có\n• Tìm món theo giá\n• Gợi ý món theo bữa hoặc thời tiết\n• Trả lời các câu hỏi chung\n\nBạn cần gì ạ?";
            }
        }
        return message;
    } catch (error) {
        console.error("Lỗi xử lý handleChat:", error);
        return "Bot đang bận một chút, bạn thử lại sau nhé! 🙏";
    }
}

router.post("/", async (req, res) => {
    try {
        const { prompt, session_id } = req.body;
        if (!prompt) return res.status(400).json({ error: "Thiếu prompt" });
        const sid = session_id || "guest_" + Date.now();
        const now = Date.now();
        let sessionData = sessions.get(sid);
        if (sessionData && (now - sessionData.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(sid);
            sessionData = null;
        }
        if (!sessionData) {
            sessionData = { history: [], lastActive: now };
        }
        const reply = await handleChat(prompt.trim(), sessionData.history);
        sessionData.history.push({ role: "user", content: prompt });
        sessionData.history.push({ role: "assistant", content: reply });
        if (sessionData.history.length > 20) {
            sessionData.history = sessionData.history.slice(-20);
        }
        sessionData.lastActive = now;
        sessions.set(sid, sessionData);
        res.json({ session_id: sid, reply, expires_in: "10 minutes" });
    } catch (error) {
        console.error("Lỗi router:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;