package com.ssafy.BlueMarble.domain.game.service;

import com.ssafy.BlueMarble.domain.game.entity.EconomicEffect;
import com.ssafy.BlueMarble.domain.game.entity.EconomicHistoryPeriod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * 경제역사 효과 서비스 (호황/불황 랜덤 적용)
 */
@Service
@Slf4j
public class EconomicHistoryService {

    private final Map<String, Map<Boolean, EconomicEffect>> economicEffects; // Period별 호황/불황 효과
    private final Random random = new Random();

    public EconomicHistoryService() {
        this.economicEffects = initializeEconomicEffects();
    }

    /**
     * 경제역사 효과 초기화 (호황/불황별)
     */
    private Map<String, Map<Boolean, EconomicEffect>> initializeEconomicEffects() {
        Map<String, Map<Boolean, EconomicEffect>> effects = new HashMap<>();

        // 근대사 - 산업혁명
        Map<Boolean, EconomicEffect> modernEffects = new HashMap<>();
        modernEffects.put(true, new EconomicEffect( // 호황 - 산업혁명
                EconomicHistoryPeriod.MODERN,
                "근대사 - 산업혁명",
                "산업혁명과 2차 산업혁명으로 공업화와 세계 무역이 확대되고 있습니다.",
                true,
                1.6,  // 월급 60% 증가 (공업화로 임금 상승)
                1.4,  // 통행료 40% 증가 (철도·운하 건설)
                1.8   // 부동산 자산 80% 증가 (도시화 가속)
        ));
        modernEffects.put(false, new EconomicEffect( // 불황 - 장기불황
                EconomicHistoryPeriod.MODERN,
                "근대사 - 1873년 장기불황",
                "1873년 장기불황으로 유럽과 미국 전반에 경기침체가 지속되고 있습니다.",
                false,
                0.6,  // 월급 40% 감소 (대량 해고)
                0.7,  // 통행료 30% 감소 (무역 위축)
                0.5   // 부동산 자산 50% 감소 (자산가치 폭락)
        ));
        effects.put("MODERN", modernEffects);

        // 근현대사 - 20세기 경제변동
        Map<Boolean, EconomicEffect> contemporaryEffects = new HashMap<>();
        contemporaryEffects.put(true, new EconomicEffect( // 호황 - 광란의 20년대
                EconomicHistoryPeriod.CONTEMPORARY,
                "근현대사 - 광란의 20년대",
                "미국 중심의 대량생산과 소비 호황으로 전후 복구 성장이 이뤄지고 있습니다.",
                true,
                2.5,  // 월급 150% 증가 (대량생산 임금상승)
                1.8,  // 통행료 80% 증가 (자동차·항공 발달)
                3.0   // 부동산 자산 200% 증가 (투기 열풍)
        ));
        contemporaryEffects.put(false, new EconomicEffect( // 불황 - 대공황
                EconomicHistoryPeriod.CONTEMPORARY,
                "근현대사 - 1929년 대공황",
                "1929년 대공황으로 전 세계적 실업과 파산이 지속되고 있습니다.",
                false,
                0.3,  // 월급 70% 감소 (25% 실업률)
                0.4,  // 통행료 60% 감소 (경제활동 마비)
                0.2   // 부동산 자산 80% 감소 (자산가치 붕괴)
        ));
        effects.put("CONTEMPORARY", contemporaryEffects);

        // 현대사 - 세계화와 IT혁명
        Map<Boolean, EconomicEffect> recentEffects = new HashMap<>();
        recentEffects.put(true, new EconomicEffect( // 호황 - 세계화
                EconomicHistoryPeriod.RECENT,
                "현대사 - 세계화와 IT혁명",
                "세계화와 IT혁명으로 정보통신과 금융자유화가 경제성장을 이끌고 있습니다.",
                true,
                2.0,  // 월급 100% 증가 (IT붐, 금융업 급성장)
                1.3,  // 통행료 30% 증가 (글로벌 물류 확대)
                2.2   // 부동산 자산 120% 증가 (도시 집중화)
        ));
        recentEffects.put(false, new EconomicEffect( // 불황 - 금융위기
                EconomicHistoryPeriod.RECENT,
                "현대사 - 2008년 금융위기",
                "글로벌 금융위기로 세계 경제가 침체되고 실업이 급증하고 있습니다.",
                false,
                0.7,  // 월급 30% 감소 (대량 구조조정)
                0.8,  // 통행료 20% 감소 (경기침체)
                0.6   // 부동산 자산 40% 감소 (서브프라임 모기지)
        ));
        effects.put("RECENT", recentEffects);

        // 미래 - 4차 산업혁명
        Map<Boolean, EconomicEffect> futureEffects = new HashMap<>();
        futureEffects.put(true, new EconomicEffect( // 호황 - AI혁신
                EconomicHistoryPeriod.FUTURE,
                "미래 - 4차 산업혁명",
                "AI, 로봇, 바이오 혁신과 친환경 에너지 전환으로 새로운 성장이 이뤄지고 있습니다.",
                true,
                3.0,  // 월급 200% 증가 (AI·바이오 고급인력)
                0.5,  // 통행료 50% 감소 (자율주행, 효율화)
                2.5   // 부동산 자산 150% 증가 (메타버스·스마트시티)
        ));
        futureEffects.put(false, new EconomicEffect( // 불황 - 기후위기
                EconomicHistoryPeriod.FUTURE,
                "미래 - 기후자원위기",
                "기후변화와 자원위기로 식량, 에너지 충격과 지정학적 갈등이 심화되고 있습니다.",
                false,
                0.5,  // 월급 50% 감소 (에너지·식량 위기)
                1.5,  // 통행료 50% 증가 (자원 부족, 운송비 급등)
                0.4   // 부동산 자산 60% 감소 (기후 재해 리스크)
        ));
        effects.put("FUTURE", futureEffects);

        return effects;
    }

    /**
     * 현재 경제역사 시대의 효과 가져오기 (호황/불황 랜덤 적용)
     */
    public EconomicEffect generateRandomEconomicEffect(EconomicHistoryPeriod period) {
        boolean isBoom = random.nextBoolean(); // 50% 확률로 호황/불황 결정
        return economicEffects.get(period.name()).get(isBoom);
    }

    /**
     * 턴 기반으로 경제역사 시대 계산
     * 2턴마다 시대 변경, 근대사부터 시작
     */
    public EconomicHistoryPeriod calculateCurrentPeriod(int gameTurn) {
        // 2턴마다 시대 변경 (턴 1-2: 근대사, 턴 3-4: 근현대사, ...)
        int periodIndex = ((gameTurn - 1) / 2) % 4;
        return EconomicHistoryPeriod.getByOrder(periodIndex);
    }

    /**
     * 현재 시대에서 다음 시대까지 남은 턴 수 계산
     */
    public int getTurnsUntilNextPeriod(int gameTurn) {
        int turnsInCurrentPeriod = ((gameTurn - 1) % 2) + 1;
        return 2 - turnsInCurrentPeriod;
    }

    /**
     * 월급에 경제역사 효과 적용
     */
    public int applyEconomicEffectToSalary(int baseSalary, EconomicEffect effect) {
        int adjustedSalary = effect.applySalaryMultiplier(baseSalary);

        log.info("💼 [ECONOMIC_HISTORY] 월급에 효과 적용: effect={}, baseSalary={}, adjustedSalary={}, multiplier={}",
                effect.getFullName(), baseSalary, adjustedSalary, effect.getSalaryMultiplier());

        return adjustedSalary;
    }

    /**
     * 통행료에 경제역사 효과 적용
     */
    public int applyEconomicEffectToToll(int baseToll, EconomicEffect effect) {
        int adjustedToll = effect.applyTollMultiplier(baseToll);

        log.info("💼 [ECONOMIC_HISTORY] 통행료에 효과 적용: effect={}, baseToll={}, adjustedToll={}, multiplier={}",
                effect.getFullName(), baseToll, adjustedToll, effect.getTollMultiplier());

        return adjustedToll;
    }

}