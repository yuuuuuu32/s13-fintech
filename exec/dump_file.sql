-- tiles 데이터 삽입 (게임판 칸 정보)
INSERT
IGNORE INTO tiles
(name, type, land_price, house_price, building_price, hotel_price, description) VALUES

('익산', 'NORMAL', 200000, 80000, 160000, 240000, '일반 도시'),
('순천', 'NORMAL', 250000, 100000, 200000, 300000, '일반 도시'),
('아산', 'NORMAL', 300000, 120000, 240000, 360000, '일반 도시'),
('청주', 'NORMAL', 350000, 140000, 280000, 420000, '일반 도시'),
('천안', 'NORMAL', 400000, 160000, 320000, 480000, '일반 도시'),
('목포', 'NORMAL', 450000, 180000, 360000, 540000, '일반 도시'),
('여수', 'NORMAL', 500000, 200000, 400000, 600000, '일반 도시'),
('나주', 'NORMAL', 550000, 220000, 440000, 660000, '일반 도시'),
('포항', 'NORMAL', 600000, 240000, 480000, 720000, '일반 도시'),
('김천', 'NORMAL', 650000, 260000, 520000, 780000, '일반 도시'),
('대구', 'NORMAL', 700000, 280000, 560000, 840000, '일반 도시'),
('수원', 'NORMAL', 750000, 300000, 600000, 900000, '일반 도시'),
('울산', 'NORMAL', 800000, 320000, 640000, 960000, '일반 도시'),
('고양', 'NORMAL', 900000, 360000, 720000, 1080000, '일반 도시'),
('창원', 'NORMAL', 1000000, 400000, 800000, 1200000, '일반 도시'),
('성남', 'NORMAL', 1100000, 440000, 880000, 1320000, '일반 도시'),
('과천', 'NORMAL', 1200000, 480000, 960000, 1440000, '일반 도시'),
('하남', 'NORMAL', 1350000, 540000, 1080000, 1620000, '일반 도시'),
('인천', 'NORMAL', 1500000, 600000, 1200000, 1800000, '일반 도시');


-- cards 데이터 삽입 (찬스카드)
-- 천사카드는 비활성화됨 (DB에 없음)
INSERT
IGNORE INTO cards (name, card_type, description, effect_type, effect_value, is_immediate)
VALUES
-- 이슈 카드들 (즉발)
('복권 당첨', 'ISSUE', '500만원 획득', 'MONEY', 5000000, true),
('사기 피해', 'ISSUE', '500만원 손실', 'MONEY', -5000000, true),
('세금 납부', 'ISSUE', '보유 현금의 15% 납부', 'MONEY_PERCENT', 15, true),
-- ('감옥행', 'ISSUE', '즉시 감옥으로 이동', 'JAIL', 0, true),
-- 게임 카드들 (즉발)
('시작점 이동', 'GAME_CARD', '시작점으로 이동하여 월급 받기', 'POSITION', 0, true),
('앞으로 3칸', 'GAME_CARD', '3칸 앞으로 이동', 'MOVE', 3, true),
('뒤로 2칸', 'GAME_CARD', '2칸 뒤로 이동', 'MOVE', -2, true),
-- 금융정책 카드들
('금리 인상', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 감소', 'ALL_MONEY_PERCENT', 10, true),
-- ('금리 인하', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 증가', 'ALL_MONEY_PERCENT', 10, true),
('세무조사', 'FINANCIAL_POLICY', '세무조사로 인해 자산 10% 하락', 'LAND_VALUE', 10, true),
('경기 침체', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 감소', 'ALL_MONEY_PERCENT', 15, true);
-- ('경기 호황', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 증가', 'ALL_MONEY_PERCENT', 15, true);

-- user 데이터 삽입
INSERT
IGNORE INTO user (
    email, password, name, nickname, role, provider, icon
) VALUES
      ('user1@example.com', 'password1', 'User One', 'userone', 'USER', 'GOOGLE', NULL),
      ('user2@example.com', 'password2', 'User Two', 'usertwo', 'USER', 'KAKAO', NULL),
      ('user3@example.com', 'password3', 'User Three', 'userthree', 'USER', 'GOOGLE', NULL),
      ('user4@example.com', 'password4', 'User Four', 'userfour', 'USER', 'KAKAO', NULL),
      ('user5@example.com', 'password5', 'User Five', 'userfive', 'ADMIN', 'GOOGLE', NULL),
      ('user6@example.com', 'password6', 'User Six', 'usersix', 'USER', 'KAKAO', NULL);
