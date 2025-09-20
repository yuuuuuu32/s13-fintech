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
('복권 당첨', 'ISSUE', '50만원 획득', 'MONEY', 5000000, true),
('사기 피해', 'ISSUE', '50만원 손실', 'MONEY', -5000000, true),
('세금 납부', 'ISSUE', '보유 현금의 15% 납부', 'MONEY_PERCENT', 15, true),
('감옥행', 'ISSUE', '즉시 감옥으로 이동', 'JAIL', 0, true),
-- 게임 카드들 (즉발)
('시작점 이동', 'GAME_CARD', '시작점으로 이동하여 월급 받기', 'POSITION', 0, true),
('앞으로 3칸', 'GAME_CARD', '3칸 앞으로 이동', 'MOVE', 3, true),
('뒤로 2칸', 'GAME_CARD', '2칸 뒤로 이동', 'MOVE', -2, true),
-- 금융정책 카드들
('금리 인상', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 감소', 'ALL_MONEY_PERCENT', 10, true),
('금리 인하', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 증가', 'ALL_MONEY_PERCENT', 10, true),
('부동산 호황', 'FINANCIAL_POLICY', '모든 땅값이 20% 상승', 'LAND_VALUE', 20, true),
('부동산 불황', 'FINANCIAL_POLICY', '모든 땅값이 20% 하락', 'LAND_VALUE', 20, true),
('경기 침체', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 감소', 'ALL_MONEY_PERCENT', 15, true),
('경기 호황', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 증가', 'ALL_MONEY_PERCENT', 15, true);

-- 경제 역사 효과 템플릿 데이터 (실제 역사 기반)
-- 게임 진행 시 EconomicHistoryService에서 시대별로 랜덤 선택됩니다.

-- 📌 근대사 (18세기 후반 ~ 19세기 말) 효과들
INSERT IGNORE INTO economic_effects (
    room_id, current_period, effect_name, description, is_boom,
    salary_multiplier, property_price_multiplier, building_cost_multiplier,
    game_turn, remaining_turns
) VALUES
-- 근대사 호황: 산업혁명
('template-modern-boom-1', 'MODERN', '산업혁명', '산업혁명과 2차 산업혁명으로 공업화, 철강·화학·전기 산업 발달, 세계 무역이 확대되고 있습니다.', true, 1.6, 1.8, 0.8, 1, 2),
-- 근대사 호황: 자유무역 체제
('template-modern-boom-2', 'MODERN', '자유무역 체제 확립', '영국 주도의 자유무역 체제 확립으로 교통·통신 발달과 세계 시장 통합이 이뤄지고 있습니다.', true, 1.5, 1.7, 0.9, 1, 2),
-- 근대사 불황: 전쟁 후 경기침체
('template-modern-recession-1', 'MODERN', '전쟁 후 경기침체', '나폴레옹 전쟁 종결 후 경기침체로 경제 활동이 위축되고 있습니다.', false, 0.7, 0.6, 1.1, 1, 2),
-- 근대사 불황: 1873년 장기불황
('template-modern-recession-2', 'MODERN', '1873년 장기불황', '1873년 장기불황으로 유럽과 미국 전반에 장기간 경기침체가 지속되고 있습니다.', false, 0.6, 0.5, 1.2, 1, 2),

-- 📌 근현대사 (20세기 초 ~ 중반) 효과들
-- 근현대사 호황: 광란의 20년대
('template-contemporary-boom-1', 'CONTEMPORARY', '광란의 20년대', '1920년대 미국 중심의 대량생산과 소비 호황으로 경제가 급성장하고 있습니다.', true, 2.5, 3.0, 1.3, 3, 2),
-- 근현대사 호황: 전후 복구와 고도성장
('template-contemporary-boom-2', 'CONTEMPORARY', '전후 복구와 고도성장', '1950~60년대 미국·서유럽·일본의 전후 복구와 경제 기적이 일어나고 있습니다.', true, 2.2, 2.8, 1.2, 3, 2),
-- 근현대사 불황: 1929년 대공황
('template-contemporary-recession-1', 'CONTEMPORARY', '1929년 대공황', '1929년 대공황으로 전 세계적 실업과 파산이 지속되고 있습니다.', false, 0.3, 0.2, 0.6, 3, 2),
-- 근현대사 불황: 1970년대 오일쇼크
('template-contemporary-recession-2', 'CONTEMPORARY', '1970년대 오일쇼크', '1970년대 오일쇼크로 스태그플레이션이 발생하여 경제가 침체되고 있습니다.', false, 0.4, 0.3, 1.4, 3, 2),

-- 📌 현대사 (20세기 후반 ~ 21세기 초반) 효과들
-- 현대사 호황: 세계화와 IT혁명
('template-recent-boom-1', 'RECENT', '세계화와 IT혁명', '1980~90년대 세계화와 IT혁명으로 정보통신과 금융자유화가 경제성장을 이끌고 있습니다.', true, 2.0, 2.2, 1.4, 5, 2),
-- 현대사 호황: 중국·신흥국 성장
('template-recent-boom-2', 'RECENT', '중국·신흥국 성장', '2000년대 초반 중국 WTO 가입과 신흥국 성장으로 세계 제조업이 확대되고 있습니다.', true, 1.8, 2.0, 1.3, 5, 2),
-- 현대사 불황: 아시아 외환위기
('template-recent-recession-1', 'RECENT', '아시아 외환위기', '1997년 아시아 외환위기로 동아시아 경제가 급격히 침체되고 있습니다.', false, 0.6, 0.5, 0.8, 5, 2),
-- 현대사 불황: 글로벌 금융위기
('template-recent-recession-2', 'RECENT', '글로벌 금융위기', '2008년 글로벌 금융위기로 세계 경제가 침체되고 실업이 급증하고 있습니다.', false, 0.7, 0.6, 0.9, 5, 2),

-- 📌 미래 (21세기 중반 이후 예상) 효과들
-- 미래 호황: 4차 산업혁명
('template-future-boom-1', 'FUTURE', '4차 산업혁명', 'AI, 로봇, 바이오 혁신으로 4차 산업혁명이 새로운 경제성장을 이끌고 있습니다.', true, 3.0, 2.5, 0.6, 7, 2),
-- 미래 호황: 친환경·에너지 전환
('template-future-boom-2', 'FUTURE', '친환경·에너지 전환', '친환경 에너지 전환 산업과 우주산업 성장으로 새로운 경제 기회가 창출되고 있습니다.', true, 2.8, 2.3, 0.7, 7, 2),
-- 미래 불황: 기후·자원 위기
('template-future-recession-1', 'FUTURE', '기후·자원 위기', '기후변화와 자원위기로 식량, 에너지 충격과 환경 재앙이 경제를 위협하고 있습니다.', false, 0.5, 0.4, 1.8, 7, 2),
-- 미래 불황: 글로벌 금융·부채 위기
('template-future-recession-2', 'FUTURE', '글로벌 금융·부채 위기', '글로벌 금융·부채 위기와 지정학적 갈등으로 세계 경제가 불안정해지고 있습니다.', false, 0.4, 0.3, 1.6, 7, 2);

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