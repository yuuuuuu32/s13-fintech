INSERT INTO tiles (name, type, land_price, house_price, building_price, hotel_price, description) VALUES
-- 시작칸
('시작', 'START', 0, 0, 0, 0, '지나가거나 도착하면 월급 받음'),

-- 일반땅 (1~2)
('익산', 'NORMAL', 50, 20, 35, 50, '일반 도시'),
('순천', 'NORMAL', 60, 25, 40, 60, '일반 도시'),

-- 찬스칸 (3)
('찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (1번째 줄)'),

-- 일반땅 (4)
('아산', 'NORMAL', 70, 28, 48, 70, '일반 도시'),

-- 싸피특별땅 (5)
('부산', 'SPECIAL', 200, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 일반땅 (6)
('청주', 'NORMAL', 90, 36, 63, 90, '일반 도시'),

-- 감옥 (7)
('감옥', 'JAIL', 0, 0, 0, 0, '3턴간 이동 불가, 보석금으로 탈출 가능'),

-- 일반땅 (8~10)
('천안', 'NORMAL', 100, 40, 70, 100, '일반 도시'),
('목포', 'NORMAL', 110, 45, 77, 110, '일반 도시'),
('여수', 'NORMAL', 120, 48, 84, 120, '일반 도시'),

-- 찬스칸 (11)
('찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (2번째 줄)'),

-- 일반땅 (12)
('나주', 'NORMAL', 130, 52, 91, 130, '일반 도시'),

-- 싸피특별땅 (13)
('광주', 'SPECIAL', 180, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 박람회 (14)
('박람회', 'EXHIBITION', 0, 0, 0, 0, '전체 땅 값 일정 배율만큼 증가'),

-- 일반땅 (15~17)
('포항', 'NORMAL', 150, 60, 105, 150, '일반 도시'),
('김천', 'NORMAL', 160, 64, 112, 160, '일반 도시'),
('대구', 'NORMAL', 170, 68, 119, 170, '일반 도시'),

-- 싸피특별땅 (18)
('구미', 'SPECIAL', 160, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 찬스칸 (19)
('찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (3번째 줄)'),

-- 싸피특별땅 (20)
('대전', 'SPECIAL', 180, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 비행기 (21)
('비행기', 'AIRPLANE', 0, 0, 0, 0, '일정 금액 지불하고 원하는 땅으로 이동'),

-- 일반땅 (22~25)
('수원', 'NORMAL', 200, 80, 140, 200, '일반 도시'),
('인천', 'NORMAL', 210, 84, 147, 210, '일반 도시'),
('고양', 'NORMAL', 220, 88, 154, 220, '일반 도시'),
('창원', 'NORMAL', 230, 92, 161, 230, '일반 도시'),

-- 싸피특별땅 (26)
('서울', 'SPECIAL', 220, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 찬스칸 (27)
('찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (4번째 줄)'),

-- 일반땅 (28~31)
('성남', 'NORMAL', 250, 100, 175, 250, '일반 도시'),
('과천', 'NORMAL', 270, 108, 189, 270, '일반 도시'),
('하남', 'NORMAL', 285, 114, 199, 285, '일반 도시'),
('인천', 'NORMAL', 300, 120, 210, 300, '일반 도시');


-- 찬스카드 데이터
INSERT INTO chance_cards (card_type, name, description, effect_type, effect_value, is_immediate) VALUES
-- 천사카드 (보유 가능)
('ANGEL', '천사카드', '부정적인 효과가 발생할 때 사용하여 회피 가능', 'AVOID_NEGATIVE', 0, false),

-- 금융정책 카드들 (즉발)
('FINANCIAL_POLICY', '금리 인상', '모든 플레이어의 현금이 10% 감소', 'MONEY_DECREASE', 10, true),
('FINANCIAL_POLICY', '금리 인하', '모든 플레이어의 현금이 10% 증가', 'MONEY_INCREASE', 10, true),
('FINANCIAL_POLICY', '부동산 호황', '모든 땅값이 20% 상승', 'LAND_PRICE_UP', 20, true),
('FINANCIAL_POLICY', '부동산 불황', '모든 땅값이 20% 하락', 'LAND_PRICE_DOWN', 20, true),

-- 이슈 카드들 (즉발)
('ISSUE', '세금 납부', '보유 현금의 15% 납부', 'TAX', 15, true),
('ISSUE', '복권 당첨', '50만원 획득', 'MONEY_GAIN', 500000, true),
('ISSUE', '사기 피해', '30만원 손실', 'MONEY_LOSS', 300000, true),
('ISSUE', '감옥행', '즉시 감옥으로 이동', 'GO_TO_JAIL', 0, true),

-- 게임 카드들 (즉발)
('GAME_CARD', '시작점 이동', '시작점으로 이동하여 월급 받기', 'GO_TO_START', 0, true),
('GAME_CARD', '무료 건설', '다음 건설 시 50% 할인', 'BUILD_DISCOUNT', 50, true),
('GAME_CARD', '땅값 동결', '3턴간 모든 통행료 면제', 'TOLL_FREEZE', 3, true),
('GAME_CARD', '강제 이주', '상대방을 원하는 위치로 이동', 'MOVE_OPPONENT', 0, true);

-- 찬스카드 데이터
INSERT INTO chance_cards (card_type, name, description, effect_type, effect_value, is_immediate) VALUES
-- 천사카드 (보유 가능)
('ANGEL', '천사카드', '부정적인 효과가 발생할 때 사용하여 회피 가능', 'AVOID_NEGATIVE', 0, false),

-- 금융정책 카드들 (즉발)
('FINANCIAL_POLICY', '금리 인상', '모든 플레이어의 현금이 10% 감소', 'MONEY_DECREASE', 10, true),
('FINANCIAL_POLICY', '금리 인하', '모든 플레이어의 현금이 10% 증가', 'MONEY_INCREASE', 10, true),
('FINANCIAL_POLICY', '부동산 호황', '모든 땅값이 20% 상승', 'LAND_PRICE_UP', 20, true),
('FINANCIAL_POLICY', '부동산 불황', '모든 땅값이 20% 하락', 'LAND_PRICE_DOWN', 20, true),

-- 이슈 카드들 (즉발)
('ISSUE', '세금 납부', '보유 현금의 15% 납부', 'TAX', 15, true),
('ISSUE', '복권 당첨', '50만원 획득', 'MONEY_GAIN', 500000, true),
('ISSUE', '사기 피해', '30만원 손실', 'MONEY_LOSS', 300000, true),
('ISSUE', '감옥행', '즉시 감옥으로 이동', 'GO_TO_JAIL', 0, true),

-- 게임 카드들 (즉발)
('GAME_CARD', '시작점 이동', '시작점으로 이동하여 월급 받기', 'GO_TO_START', 0, true),
('GAME_CARD', '무료 건설', '다음 건설 시 50% 할인', 'BUILD_DISCOUNT', 50, true),
('GAME_CARD', '땅값 동결', '3턴간 모든 통행료 면제', 'TOLL_FREEZE', 3, true),
('GAME_CARD', '강제 이주', '상대방을 원하는 위치로 이동', 'MOVE_OPPONENT', 0, true);

-- ID를 고정해 tempLogin 등에서 참조 가능하도록 함
INSERT INTO `user` (id, email, password, name, nickname, role, provider, fcm_token, name_tag, icon) VALUES
(1, 'test1@example.com', '{noop}pass', '테스터원', 'tester1', 'USER', 'GOOGLE', NULL, NULL, NULL),
(2, 'admin@example.com', '{noop}admin', '관리자', 'admin1', 'ADMIN', 'GOOGLE', NULL, NULL, NULL);